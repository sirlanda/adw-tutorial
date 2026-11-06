import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure } from "../../engine/Outcome";
import type { RunContext } from "../../engine/RunContext";
import { ReplySchema, type Mail, type ReplyState } from "../state";

const DrafterOutputSchema = NodeOutputBaseSchema.extend({ reply: ReplySchema });
type DrafterOutput = z.infer<typeof DrafterOutputSchema>;

// Válasz-vázlat. Egyelőre sablon; a 4. lépésben ügynök veszi át a helyét.
export class Drafter extends ExecNode<ReplyState, { mail: Mail }, DrafterOutput> {
  constructor(ctx: RunContext, to: string) {
    super(ctx, "draft", "drafter", to, DrafterOutputSchema);
  }

  protected input(state: ReplyState): { mail: Mail } {
    return { mail: state.mail! };
  }

  protected async run(_state: ReplyState, input: { mail: Mail }): Promise<DrafterOutput> {
    const reply = { subject: `Re: ${input.mail.subject}`, body: "Köszönjük levelét, hamarosan válaszolunk." };
    return { status: "ok", done: ["sablon vázlat elkészült"], problems: [], reply };
  }

  protected apply(state: ReplyState, out: DrafterOutput): Failure | null {
    state.draft = out.reply;
    return null;
  }
}
