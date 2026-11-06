import { z } from "zod";
import { AgentNode } from "../../engine/AgentNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure } from "../../engine/Outcome";
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
    return { mail: state.mail!, draft: state.draft!, problems: state.check!.problems };
  }

  protected apply(state: ReplyState, out: FixerOutput): Failure | null {
    state.draft = out.reply;
    state.iteration += 1;
    return null;
  }
}
