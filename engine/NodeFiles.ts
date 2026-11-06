import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { NodeOutputBase } from "./NodeOutput";
import type { Workspace } from "./Workspace";

// Egy node egy lépésének fájljai a futás könyvtárában:
//   io/<seq>-<name>-input.json    amit a node kapott (az egyetlen igazságforrás a feladatról)
//   io/<seq>-<name>-output.json   amit a node válaszolt (séma szerint validálva)
//   reports/<seq>-<name>.md       emberi olvasásra, az outputból generálva
export class NodeFiles {
  constructor(
    private readonly ws: Workspace,
    readonly seq: number,
    readonly name: string,
  ) {
    mkdirSync(join(ws.dir, "io"), { recursive: true });
    mkdirSync(join(ws.dir, "reports"), { recursive: true });
  }

  get inputPath(): string {
    return join(this.ws.dir, "io", `${this.seq}-${this.name}-input.json`);
  }

  get outputPath(): string {
    return join(this.ws.dir, "io", `${this.seq}-${this.name}-output.json`);
  }

  get reportPath(): string {
    return join(this.ws.dir, "reports", `${this.seq}-${this.name}.md`);
  }

  writeInput(input: unknown): void {
    writeFileSync(this.inputPath, JSON.stringify(input, null, 2) + "\n");
  }

  writeOutput(output: unknown): void {
    writeFileSync(this.outputPath, JSON.stringify(output, null, 2) + "\n");
  }

  writeReport(output: NodeOutputBase, extra: Record<string, unknown> = {}): void {
    const front = Object.entries({ node: this.name, seq: this.seq, status: output.status, ...extra })
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- (nincs)");
    const body = `---\n${front}\n---\n\n## Elvégezve\n\n${list(output.done)}\n\n## Problémák\n\n${list(output.problems)}\n`;
    writeFileSync(this.reportPath, body);
  }
}
