import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Agent, AgentRequest, AgentResult } from "./Agent";

// Felvételről játszik: egy korábbi futás io/<seq>-<name>-output.json fájlját adja vissza.
// A demo ezzel fut (ADW_AGENT=replay), determinisztikusan és azonnal; a gépezet ugyanaz.
export class ReplayAgent implements Agent {
  readonly kind = "replay";

  constructor(private readonly sourceDir: string) {}

  async run(request: AgentRequest, seq: number, name: string): Promise<AgentResult> {
    const file = join(this.sourceDir, "io", `${seq}-${name}-output.json`);
    if (!existsSync(file)) return { ok: false, output: undefined, costUsd: null, error: `nincs felvétel: ${file}` };
    const output = JSON.parse(readFileSync(file, "utf8"));
    const transcript = join(this.sourceDir, "logs", `${seq}-${name}.jsonl`);
    if (existsSync(transcript)) await Bun.write(request.transcriptPath, Bun.file(transcript));
    return { ok: true, output, costUsd: 0, error: null };
  }
}
