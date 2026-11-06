import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Mail, Reply } from "../workflow/state";

// Triage első lépcsője: kód. Rövid, egyértelmű kérdésre sablonválasz megy, ügynök nélkül.
// A minta szigorú, mert egy rossz sablonválasz drágább, mint egy ügynök-hívás.
const TEMPLATES: { pattern: RegExp; file: string }[] = [
  { pattern: /nyitva|nyitvatartás/i, file: "nyitvatartas.md" },
  { pattern: /szállítási (idő|határidő)|mennyi (idő|ideig).*szállít|mikor (érkezik|jön) meg a csomag/i, file: "szallitas.md" },
];
const MAX_WORDS = 60; // ennél hosszabb levél nem "egyszerű kérdés"

export class Templates {
  constructor(private readonly root: string) {}

  match(mail: Mail): Reply | null {
    if (mail.body.split(/\s+/).length > MAX_WORDS) return null;
    const hit = TEMPLATES.find((t) => t.pattern.test(mail.subject) || t.pattern.test(mail.body));
    if (!hit) return null;
    const body = readFileSync(join(this.root, "kb", "sablon", hit.file), "utf8").trim();
    return { subject: `[${mail.ticket_id}] Re: ${mail.subject}`, body };
  }
}
