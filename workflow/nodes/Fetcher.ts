import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import { MailSchema, type ReplyState } from "../state";

const FetcherOutputSchema = NodeOutputBaseSchema.extend({ mail: MailSchema });
type FetcherOutput = z.infer<typeof FetcherOutputSchema>;

// A levél letöltése. Determinisztikus kód, a Mailbox service-en át.
export class Fetcher extends ExecNode<ReplyState, { ticket_id: string }, FetcherOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "fetch", "fetcher", to, FetcherOutputSchema);
  }

  protected input(state: ReplyState): { ticket_id: string } {
    return { ticket_id: state.ticket_id };
  }

  protected async run(_state: ReplyState, input: { ticket_id: string }): Promise<FetcherOutput> {
    const mail = this.ctx.mailbox.fetch(input.ticket_id);
    return { status: "ok", done: [`letöltve: ${mail.subject} (${mail.from})`], problems: [], mail };
  }

  protected apply(state: ReplyState, out: FetcherOutput): Outcome | null {
    state.mail = out.mail;
    return null;
  }
}
