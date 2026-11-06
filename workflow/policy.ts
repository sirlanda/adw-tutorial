import type { ReplyState } from "./state";

// "Off the loop": mikor mehet a válasz emberi jóváhagyás NÉLKÜL. Kódban, egy helyen,
// számokkal. Minden más (dühös ügyfél, bizonytalan szint, nagy súly) marad a 7. lépés
// jóváhagyásánál. A küszöbök a rögzített futások Jev-értékeiből vannak belőve.
export const AUTO_SEND = { minLevelConfidence: 0.8, maxImportance: 1.5 };

export function autoSend(s: ReplyState): boolean {
  if (s.check?.green !== true) return false;
  if (s.triage?.route === "template") return true; // sablonválasz: kód írta, kód küldi
  const jev = s.triage?.jev;
  if (!jev) return false; // Jev nélkül nincs automatikus küldés
  return (
    jev.support_level === "L1" &&
    jev.support_level_confidence >= AUTO_SEND.minLevelConfidence &&
    jev.tone !== "angry" &&
    jev.importance <= AUTO_SEND.maxImportance
  );
}
