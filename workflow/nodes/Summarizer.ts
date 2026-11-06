import { z } from "zod";
import { AgentNode } from "../../engine/AgentNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import type { Mail, ReplyState } from "../state";
import type { Triage } from "../triage";

const SummarizerOutputSchema = NodeOutputBaseSchema.extend({ summary: z.string() });
type SummarizerOutput = z.infer<typeof SummarizerOutputSchema>;
type SummarizerInput = { mail: Mail; triage: Triage | null };

// Triage harmadik lépcsője: olcsó LLM. Nem ítél (az a Jev dolga), hanem szöveget ad:
// három sor az átadó kollégának. A modellt a prompt frontmatterje választja (haiku).
export class Summarizer extends AgentNode<ReplyState, SummarizerInput, SummarizerOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "summarize", to, { name: "summarizer", promptFile: "summarizer.md", schema: SummarizerOutputSchema, timeoutMs: 2 * 60_000 });
  }

  protected input(state: ReplyState): SummarizerInput {
    return { mail: state.mail!, triage: state.triage?.jev ?? null };
  }

  protected apply(state: ReplyState, out: SummarizerOutput): Outcome | null {
    state.summary = out.summary;
    return null;
  }
}
