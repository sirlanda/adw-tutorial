import { z } from "zod";
import { AgentNode } from "../../engine/AgentNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Failure } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import { ReplySchema, type Mail, type ReplyState } from "../state";

const WriterOutputSchema = NodeOutputBaseSchema.extend({ reply: ReplySchema });
type WriterOutput = z.infer<typeof WriterOutputSchema>;

// A válasz megírása: itt kell ítélet, ezért ügynök. A prompt a prompts/writer.md,
// a válasz alakja a séma, a node csak az inputot és az apply-t adja.
export class Writer extends AgentNode<ReplyState, { mail: Mail }, WriterOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "write", to, { name: "writer", promptFile: "writer.md", schema: WriterOutputSchema, timeoutMs: 5 * 60_000 });
  }

  protected input(state: ReplyState): { mail: Mail } {
    return { mail: state.mail! };
  }

  protected apply(state: ReplyState, out: WriterOutput): Failure | null {
    state.draft = out.reply;
    return null;
  }
}
