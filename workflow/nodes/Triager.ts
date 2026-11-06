import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import { ReplySchema, type Mail, type ReplyState } from "../state";
import { JEV_THRESHOLDS, triageQuestions, TriageSchema } from "../triage";

const TriagerOutputSchema = NodeOutputBaseSchema.extend({
  route: z.enum(["template", "write", "escalate"]),
  template: ReplySchema.nullable(),
  triage: TriageSchema.nullable(),
});
type TriagerOutput = z.infer<typeof TriagerOutputSchema>;

// Triage három lépcsőben, olcsótól a drágáig: kód (sablon), Jev (ítélet), és csak a maradék
// megy az ügynökhöz. Jev nélkül vagy hibánál minden az ügynökhöz megy: a futás nem áll meg.
export class Triager extends ExecNode<ReplyState, { mail: Mail }, TriagerOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "triage", "triager", to, TriagerOutputSchema);
  }

  protected input(state: ReplyState): { mail: Mail } {
    return { mail: state.mail! };
  }

  protected async run(_state: ReplyState, input: { mail: Mail }): Promise<TriagerOutput> {
    // 1. kód: sablonkérdés
    const template = this.ctx.templates.match(input.mail);
    if (template) {
      return { status: "ok", done: ["sablonválasz, ügynök nélkül"], problems: [], route: "template", template, triage: null };
    }
    // 2. Jev: hat kérdés egy kérésben
    const a = await this.ctx.jev.judge("triage", { subject: input.mail.subject, body: input.mail.body }, triageQuestions());
    if (!a) {
      return { status: "ok", done: ["Jev nem válaszolt, minden az ügynökhöz"], problems: [], route: "write", template: null, triage: null };
    }
    const triage = TriageSchema.parse({
      importance: a.importance.score,
      urgency: a.urgency.score,
      deadline: a.deadline.choice,
      tone: a.tone.choice,
      complexity: a.complexity.score,
      support_level: a.support_level.choice,
      support_level_confidence: a.support_level.confidence,
    });
    // 3. a döntés kódban: csak magabiztos L2/L3 ítélet visz emberhez
    const escalate = triage.support_level !== "L1" && triage.support_level_confidence >= JEV_THRESHOLDS.escalateConfidence;
    const route = escalate ? "escalate" : "write";
    const done = [
      `Jev: ${triage.support_level} (${triage.support_level_confidence.toFixed(2)}), hangnem ${triage.tone}, sürgősség ${triage.urgency.toFixed(1)}, súly ${triage.importance.toFixed(1)}`,
      route === "escalate" ? "emberhez megy, ügynök nem ír választ" : "az ügynök ír, a triage priorként az inputjában",
    ];
    return { status: "ok", done, problems: [], route, template: null, triage };
  }

  protected apply(state: ReplyState, out: TriagerOutput): Outcome | null {
    state.triage = { route: out.route, jev: out.triage };
    if (out.template) state.draft = out.template;
    return null;
  }
}
