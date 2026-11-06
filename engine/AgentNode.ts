import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ExecNode, NodeFailure } from "./ExecNode";
import type { NodeOutputBase } from "./NodeOutput";
import { loadPrompt, render, withError } from "./Prompt";
import type { RunContext } from "./RunContext";
import type { EngineState } from "./state";

export interface AgentSpec<Out> {
  name: string;
  promptFile: string; // prompts/<név>.md
  schema: z.ZodType<Out>;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;

// Ügynök-node: egy ExecNode, aminek a munkáját egy friss ügynök-folyamat végzi.
// A leszármazott csak input() és apply() horgot ad; a prompt fájl, a séma és a retry itt van.
export abstract class AgentNode<S extends EngineState, In, Out extends NodeOutputBase> extends ExecNode<S, In, Out> {
  constructor(
    ctx: RunContext,
    id: string,
    to: string,
    protected readonly spec: AgentSpec<Out>,
  ) {
    super(ctx, id, spec.name, to, spec.schema);
  }

  /** Extra változók a prompthoz; alapból az input skalár mezői és a szabványos készlet. */
  protected vars(_state: S, _input: In): Record<string, string | number> {
    return {};
  }

  protected async run(state: S, input: In): Promise<Out> {
    const prompt = loadPrompt(join(this.ctx.root, "prompts", this.spec.promptFile));
    const files = { input: join(this.ctx.ws.dir, "io", `${state.seq}-${this.name}-input.json`) };
    mkdirSync(join(this.ctx.ws.dir, "logs"), { recursive: true });

    const vars = {
      ticket_id: state.ticket_id,
      execution_id: state.execution_id,
      iteration: state.iteration,
      seq: state.seq,
      node_name: this.name,
      root: this.ctx.root,
      input_file: files.input,
      kb_dir: join(this.ctx.root, "kb"),
      ...scalarVars(input),
      ...this.vars(state, input),
    };
    let text = render(prompt.body, vars);
    writeFileSync(join(this.ctx.ws.dir, "io", `${state.seq}-${this.name}-prompt.md`), text);

    const systemPrompt = render(await Bun.file(join(this.ctx.root, "systemprompt.md")).text(), vars);
    const jsonSchema = z.toJSONSchema(this.spec.schema, { target: "draft-7" });

    // Egy újrapróbálás a hibával kiegészített prompttal; a második hiba a gépezet hibája.
    let lastError = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const transcriptPath = join(this.ctx.ws.dir, "logs", `${state.seq}-${this.name}${attempt === 2 ? "-retry" : ""}.jsonl`);
      const result = await this.ctx.agent.run(
        { prompt: text, systemPrompt, jsonSchema, allowedTools: prompt.allowedTools, model: prompt.model, timeoutMs: this.spec.timeoutMs ?? DEFAULT_TIMEOUT_MS, cwd: this.ctx.root, transcriptPath },
        state.seq,
        this.name,
      );
      this.ctx.ws.log({ event: "agent", node: this.name, attempt, agent: this.ctx.agent.kind, ok: result.ok, cost_usd: result.costUsd });
      if (result.ok) {
        const parsed = this.spec.schema.safeParse(result.output);
        if (parsed.success) return parsed.data;
        lastError = z.prettifyError(parsed.error);
      } else {
        lastError = result.error ?? "ismeretlen hiba";
      }
      text = withError(text, lastError);
    }
    throw new NodeFailure(`${this.name}: két kísérlet után sincs érvényes válasz: ${lastError}`);
  }
}

/** Az input skalár mezői név szerint, a többi <kulcs>_json néven. */
function scalarVars(input: unknown): Record<string, string | number> {
  const vars: Record<string, string | number> = {};
  if (typeof input !== "object" || input === null) return vars;
  for (const [k, v] of Object.entries(input)) {
    vars[typeof v === "string" || typeof v === "number" ? k : `${k}_json`] =
      typeof v === "string" || typeof v === "number" ? v : JSON.stringify(v, null, 2);
  }
  return vars;
}
