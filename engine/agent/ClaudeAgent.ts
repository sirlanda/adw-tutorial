import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { filteredEnv, type Agent, type AgentRequest, type AgentResult } from "./Agent";

// claude -p futtatás. A stream-json kimenet minden sora egy üzenet (init, assistant,
// tool_result, result): az egészet az átirat-fájlba írjuk, az utolsó `result` sor hordozza a
// strukturált választ és a költséget. Web és bash nincs: az ügynök olvas és válaszol.
const DISALLOWED_TOOLS = ["WebFetch", "WebSearch", "Bash", "Write", "Edit", "MultiEdit", "NotebookEdit"];

interface ResultMessage {
  type?: string;
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  total_cost_usd?: number;
}

export class ClaudeAgent implements Agent {
  readonly kind = "claude";

  async run(request: AgentRequest): Promise<AgentResult> {
    const args = [
      "-p", request.prompt,
      "--output-format", "stream-json", "--verbose",
      "--json-schema", JSON.stringify(request.jsonSchema),
      "--append-system-prompt", request.systemPrompt,
      "--allowedTools", request.allowedTools.join(","),
      "--disallowedTools", DISALLOWED_TOOLS.join(","),
    ];
    if (request.model) args.push("--model", request.model);

    const child = spawn("claude", args, { cwd: request.cwd, env: filteredEnv(), stdio: ["ignore", "pipe", "pipe"] });
    const transcript = createWriteStream(request.transcriptPath);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      transcript.write(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), request.timeoutMs);
    const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
    clearTimeout(timer);
    transcript.end();

    const result = lastResult(stdout);
    if (code !== 0 || !result || result.is_error) {
      const detail = result?.result ?? stderr.trim().split("\n").slice(-5).join("\n");
      return { ok: false, output: undefined, costUsd: result?.total_cost_usd ?? null, error: `claude exit ${code}: ${detail}` };
    }
    return { ok: true, output: result.structured_output, costUsd: result.total_cost_usd ?? null, error: null };
  }
}

function lastResult(stdout: string): ResultMessage | null {
  let found: ResultMessage | null = null;
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line) as ResultMessage;
      if (message.type === "result") found = message;
    } catch {
      /* nem JSON sor, az átiratban marad */
    }
  }
  return found;
}
