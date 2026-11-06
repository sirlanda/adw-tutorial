import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import type { ReplyState } from "../state";

const EscalateOutputSchema = NodeOutputBaseSchema.extend({ handover: z.string() });
type EscalateOutput = z.infer<typeof EscalateOutputSchema>;
type EscalateInput = { status: string; reason: string | null; problems: string[] };

// A failure node: nem javít, hanem átad. Leírja, hol tart az ügy, és kinek kell folytatnia.
export class Escalate extends ExecNode<ReplyState, EscalateInput, EscalateOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "escalate", "escalate", to, EscalateOutputSchema);
  }

  protected input(state: ReplyState): EscalateInput {
    return { status: state.status, reason: state.stuck_reason ?? null, problems: state.check?.problems ?? [] };
  }

  protected async run(state: ReplyState, input: EscalateInput): Promise<EscalateOutput> {
    const handover = [
      `Ügy: ${state.ticket_id}, futás: ${state.execution_id}, státusz: ${input.status}.`,
      input.reason ? `Ok: ${input.reason}` : "",
      state.draft ? "Az utolsó vázlat a state.json draft mezőjében." : "Vázlat nem készült.",
    ]
      .filter(Boolean)
      .join(" ");
    return { status: "ok", done: ["átadva az ügyfélszolgálati vezetőnek"], problems: input.problems, handover };
  }

  protected apply(state: ReplyState, out: EscalateOutput): Failure | null {
    state.handover = out.handover;
    return null;
  }
}
