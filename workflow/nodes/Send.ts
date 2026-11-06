import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import type { Reply, ReplyState } from "../state";

const SendOutputSchema = NodeOutputBaseSchema.extend({ file: z.string() });
type SendOutput = z.infer<typeof SendOutputSchema>;

// Az éles művelet. Ide csak a gate-en át vezet út.
export class Send extends ExecNode<ReplyState, { reply: Reply }, SendOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "send", "send", to, SendOutputSchema);
  }

  protected input(state: ReplyState): { reply: Reply } {
    return { reply: state.draft! };
  }

  protected async run(state: ReplyState, input: { reply: Reply }): Promise<SendOutput> {
    const file = this.ctx.sender.send(state.ticket_id, input.reply);
    return { status: "ok", done: [`elküldve: ${file}`], problems: [], file };
  }

  protected apply(state: ReplyState, out: SendOutput): Outcome | null {
    state.sent = out.file;
    return null;
  }
}
