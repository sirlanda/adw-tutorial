import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure } from "../../engine/Outcome";
import type { RunContext } from "../../engine/RunContext";
import { MailSchema, type ReplyState } from "../state";

const FetcherOutputSchema = NodeOutputBaseSchema.extend({ mail: MailSchema });
type FetcherOutput = z.infer<typeof FetcherOutputSchema>;

// A levél letöltése. Determinisztikus: az inbox/<ticket>.json fájl (az IMAP-ot szimulálja).
export class Fetcher extends ExecNode<ReplyState, { ticket_id: string }, FetcherOutput> {
  constructor(ctx: RunContext, to: string) {
    super(ctx, "fetch", "fetcher", to, FetcherOutputSchema);
  }

  protected input(state: ReplyState): { ticket_id: string } {
    return { ticket_id: state.ticket_id };
  }

  protected async run(_state: ReplyState, input: { ticket_id: string }): Promise<FetcherOutput> {
    const file = join(this.ctx.root, "inbox", `${input.ticket_id}.json`);
    const mail = MailSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    return { status: "ok", done: [`letöltve: ${mail.subject} (${mail.from})`], problems: [], mail };
  }

  protected apply(state: ReplyState, out: FetcherOutput): Failure | null {
    state.mail = out.mail;
    return null;
  }
}
