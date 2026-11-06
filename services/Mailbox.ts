import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MailSchema, type Mail } from "../workflow/state";

// A külvilág egyik kapuja: a levelek. A tananyagban az inbox/ mappa az IMAP-szerver;
// a workflow csak ezt az osztályt hívja, ezért a valódi levelezés egy fájlt érint.
export class Mailbox {
  constructor(private readonly root: string) {}

  fetch(ticketId: string): Mail {
    const file = join(this.root, "inbox", `${ticketId}.json`);
    return MailSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  }
}
