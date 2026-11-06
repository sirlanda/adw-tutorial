import { z } from "zod";
import { choice, score } from "../services/Jev";

// A Jev-kérdések egy helyen, egy kérésben, párhuzamosan megválaszolva. A kérdés a kód
// része: verziózható, tesztelhető, és a válasz típusa a kódból következik.
export const SUPPORT_LEVELS = {
  L1: "ügyfélszolgálat: a tudásbázisból (GYIK, szabályzat) megválaszolható kérés vagy reklamáció",
  L2: "üzleti döntés: a szabályzaton kívüli kérés, kivétel, egyedi ajánlat, amiről vezető vagy üzleti elemző dönt",
  L3: "technika: a webáruház vagy a rendszer hibája, amit üzemeltető vagy fejlesztő javít",
} as const;

export function triageQuestions() {
  return {
    importance: score("Mekkora az ügy üzleti súlya a kertészet számára?", [
      "kicsi: egy vásárló egyszerű kérdése",
      "közepes: reklamáció, pénz vagy csere forog kockán",
      "nagy: nagy összeg, céges ügyfél, jogi vagy hírnév-kockázat",
    ]),
    urgency: score("Mennyire sürgős a válasz?", ["nem sürgős", "napokon belül kell", "még ma kell"]),
    deadline: choice("Említ a levél határidőt?", {
      none: "nincs határidő",
      today: "ma vagy holnap",
      this_week: "ezen a héten",
      date_in_mail: "konkrét dátum szerepel a levélben",
    }),
    tone: choice("Milyen a levél hangneme?", {
      angry: "dühös, fenyegető, csupa nagybetű, felkiáltójelek",
      neutral: "tárgyilagos",
      friendly: "barátságos, udvarias",
    }),
    complexity: score("Mennyire összetett a válasz?", [
      "egy sablonmondat elég",
      "a tudásbázisból összeállítható",
      "egyedi mérlegelés vagy több fél kell hozzá",
    ]),
    support_level: choice("Ki tudja érdemben megoldani?", SUPPORT_LEVELS),
  };
}

export const TriageSchema = z.object({
  importance: z.number(),
  urgency: z.number(),
  deadline: z.enum(["none", "today", "this_week", "date_in_mail"]),
  tone: z.enum(["angry", "neutral", "friendly"]),
  complexity: z.number(),
  support_level: z.enum(["L1", "L2", "L3"]),
  support_level_confidence: z.number(),
});
export type Triage = z.infer<typeof TriageSchema>;

// Küszöbök kódban: a Jev valószínűséget ad, hogy mi számít döntésnek, azt mi mondjuk meg.
export const JEV_THRESHOLDS = { escalateConfidence: 0.6 };
