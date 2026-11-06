import type { Mail, Reply } from "../workflow/state";

// A válaszlevél szabályai. Kódban, determinisztikusan: ugyanarra a levélre mindig ugyanaz
// az eredmény. Minden megsértett szabály egy problems[] sor "[severity] hely: összefoglaló"
// alakban. A szabályok forrása a kb/hangnem.md, csak itt gépi alakban.
const FORBIDDEN = /\b(garantál|biztosan|ingyen|azonnal|mindenképp)/i;
const ORDER_NUMBER = /NK-\d{6}/g;
const SIGNATURE = "Napsugár Kertészet ügyfélszolgálat";
const HUNGARIAN_WORDS = /\b(és|hogy|nem|köszönjük|levelét|üdvözlettel|kérjük|munkanap)\b/gi;
const MAX_WORDS = 150;

export class Checker {
  check(mail: Mail, reply: Reply): string[] {
    const problems: string[] = [];
    const body = reply.body.trim();

    if (!reply.subject.includes(`[${mail.ticket_id}]`)) {
      problems.push(`[error] subject: hiányzik az ügy azonosítója: [${mail.ticket_id}]`);
    }
    if (!/^Kedves .+!/.test(body)) {
      problems.push("[error] body: a levél nem 'Kedves ...!' megszólítással kezdődik");
    }
    if (!body.endsWith(SIGNATURE)) {
      problems.push(`[error] body: a levél nem a '${SIGNATURE}' aláírással végződik`);
    }
    const forbidden = body.match(new RegExp(FORBIDDEN, "gi")) ?? [];
    for (const word of forbidden) {
      problems.push(`[error] body: tiltott ígéret: '${word}'`);
    }
    const words = body.split(/\s+/).length;
    if (words > MAX_WORDS) {
      problems.push(`[warn] body: ${words} szó, a határ ${MAX_WORDS}`);
    }
    if ((body.match(HUNGARIAN_WORDS) ?? []).length < 2) {
      problems.push("[error] body: a válasz nem tűnik magyar nyelvűnek");
    }
    for (const order of new Set(mail.body.match(ORDER_NUMBER) ?? [])) {
      if (!body.includes(order)) problems.push(`[error] body: a levél rendelésszáma (${order}) nincs a válaszban`);
    }
    return problems;
  }
}
