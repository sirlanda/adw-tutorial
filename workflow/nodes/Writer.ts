import { z } from "zod";
import { AgentNode } from "../../engine/AgentNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import { ReplySchema, type Mail, type ReplyState } from "../state";
import type { Triage } from "../triage";

const WriterOutputSchema = NodeOutputBaseSchema.extend({ reply: ReplySchema });
type WriterOutput = z.infer<typeof WriterOutputSchema>;

// A válasz megírása: itt kell ítélet, ezért ügynök. A prompt a prompts/writer.md,
// a válasz alakja a séma, a node csak az inputot és az apply-t adja.
type WriterInput = { mail: Mail; triage: Triage | null };

export class Writer extends AgentNode<ReplyState, WriterInput, WriterOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "write", to, { name: "writer", promptFile: "writer.md", schema: WriterOutputSchema, timeoutMs: 5 * 60_000 });
  }

  protected input(state: ReplyState): WriterInput {
    return { mail: state.mail!, triage: state.triage?.jev ?? null }; // a triage prior, nem parancs
  }

  protected apply(state: ReplyState, out: WriterOutput): Outcome | null {
    state.draft = out.reply;
    return null;
  }
}
