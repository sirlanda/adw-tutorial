import { z } from "zod";
import { AgentNode } from "../../engine/AgentNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure, Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import { ReplySchema, type Mail, type Reply, type ReplyState } from "../state";

const FixerOutputSchema = NodeOutputBaseSchema.extend({ reply: ReplySchema });
type FixerOutput = z.infer<typeof FixerOutputSchema>;
type FixerInput = { mail: Mail; draft: Reply; problems: string[] };

// A javítás ügynöki munka, de hogy HÁNYSZOR próbálhat, azt a kód mondja meg (guard).
export class Fixer extends AgentNode<ReplyState, FixerInput, FixerOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "fix", to, { name: "fixer", promptFile: "fixer.md", schema: FixerOutputSchema, timeoutMs: 5 * 60_000 });
  }

  protected guard(state: ReplyState): Failure | null {
    if (state.iteration >= this.ctx.limits.maxFix) {
      return { kind: "max_reached", reason: `fixer: ${state.iteration} javítási kör után még mindig piros a kapu` };
    }
    return null;
  }

  protected input(state: ReplyState): FixerInput {
    // A kapu hibái és az ember elutasító jegyzete ugyanazon a csatornán: problems[].
    const human = state.approval?.decision === "rejected" && state.approval.note ? [`[human] jegyzet: ${state.approval.note}`] : [];
    return { mail: state.mail!, draft: state.draft!, problems: [...state.check!.problems, ...human] };
  }

  protected apply(state: ReplyState, out: FixerOutput): Outcome | null {
    state.draft = out.reply;
    state.iteration += 1;
    state.approval = undefined; // a jegyzet feldolgozva, a következő kör új döntést kér
    return null;
  }
}
