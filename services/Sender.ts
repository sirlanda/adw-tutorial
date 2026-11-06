import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Reply } from "../workflow/state";

// A külvilág másik kapuja: a küldés. A tananyagban a sent/ mappa a kimenő levelezés;
// ez az egyetlen "éles" művelet, ezért csak kódból, csak döntés után hívható.
export class Sender {
  constructor(private readonly root: string) {}

  /** Javaslat az embernek: outbox/<ticket>.md, felülírja az előző verziót. */
  propose(ticketId: string, reply: Reply, note: string): string {
    const file = join(this.root, "outbox", `${ticketId}.md`);
    mkdirSync(join(this.root, "outbox"), { recursive: true });
    writeFileSync(file, `---\nticket: ${ticketId}\n${note}\n---\n\n**Tárgy:** ${reply.subject}\n\n${reply.body}\n`);
    return file;
  }

  /** Küldés: sent/<ticket>.md, az outbox-példány törlődik. */
  send(ticketId: string, reply: Reply): string {
    const file = join(this.root, "sent", `${ticketId}.md`);
    mkdirSync(join(this.root, "sent"), { recursive: true });
    writeFileSync(file, `---\nticket: ${ticketId}\nsent_at: ${new Date().toISOString()}\n---\n\n**Tárgy:** ${reply.subject}\n\n${reply.body}\n`);
    const pending = join(this.root, "outbox", `${ticketId}.md`);
    if (existsSync(pending)) rmSync(pending);
    return file;
  }
}
