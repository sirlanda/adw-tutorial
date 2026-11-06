import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import { waiting, type Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import type { Reply, ReplyState } from "../state";

const ProposeOutputSchema = NodeOutputBaseSchema.extend({ file: z.string() });
type ProposeOutput = z.infer<typeof ProposeOutputSchema>;
type ProposeInput = { reply: Reply; iteration: number; level: string | null };

// "Near the loop": a megoldás kész, éles művelet nincs. Kitesszük az outboxba, és a futás
// megáll, amíg az ember nem dönt (--approve / --reject). A folytatás a gate node-nál indul.
export class Propose extends ExecNode<ReplyState, ProposeInput, ProposeOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    private readonly resumeAt: string,
  ) {
    super(ctx, "propose", "propose", resumeAt, ProposeOutputSchema);
  }

  protected input(state: ReplyState): ProposeInput {
    return { reply: state.draft!, iteration: state.iteration, level: state.triage?.jev?.support_level ?? null };
  }

  protected async run(state: ReplyState, input: ProposeInput): Promise<ProposeOutput> {
    const note = `execution: ${state.execution_id}\niteration: ${input.iteration}\nlevel: ${input.level ?? "-"}`;
    const file = this.ctx.sender.propose(state.ticket_id, input.reply, note);
    return { status: "ok", done: [`javaslat kitéve: ${file}`], problems: [], file };
  }

  protected apply(state: ReplyState, out: ProposeOutput): Outcome | null {
    state.proposal = out.file;
    return waiting(this.resumeAt, "emberi jóváhagyásra vár");
  }
}
