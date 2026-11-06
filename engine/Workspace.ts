import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

// Egy futás könyvtára: .adw/<ticket>/<execution>/. Itt van a state.json (a futás teljes
// igazsága) és a log.jsonl (minden átmenet egy sor). Semmi más nem tárol futási állapotot.
export class Workspace {
  readonly dir: string;

  constructor(readonly root: string, readonly ticketId: string, readonly executionId: string) {
    this.dir = join(root, ".adw", ticketId, executionId);
    mkdirSync(this.dir, { recursive: true });
  }

  /** Új futás: a következő sorszám a ticket könyvtárában (01, 02, ...). */
  static create(root: string, ticketId: string): Workspace {
    const ticketDir = join(root, ".adw", ticketId);
    const previous = existsSync(ticketDir) ? readdirSync(ticketDir).filter((d) => /^\d+$/.test(d)) : [];
    const n = previous.length + 1;
    return new Workspace(root, ticketId, String(n).padStart(2, "0"));
  }

  /** Folytatás: a ticket legutolsó futása. */
  static latest(root: string, ticketId: string): Workspace {
    const ticketDir = join(root, ".adw", ticketId);
    const runs = existsSync(ticketDir) ? readdirSync(ticketDir).filter((d) => /^\d+$/.test(d)).sort() : [];
    const last = runs.at(-1);
    if (!last) throw new Error(`nincs korábbi futás: ${ticketId}`);
    return new Workspace(root, ticketId, last);
  }

  save(state: unknown): void {
    writeFileSync(join(this.dir, "state.json"), JSON.stringify(state, null, 2) + "\n");
  }

  load<S>(): S {
    return JSON.parse(readFileSync(join(this.dir, "state.json"), "utf8")) as S;
  }

  log(entry: Record<string, unknown>): void {
    appendFileSync(join(this.dir, "log.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  }
}
