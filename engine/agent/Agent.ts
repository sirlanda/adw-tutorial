// Az ügynök-hívás felülete. Egy hívás = egy friss folyamat, egy prompt, egy válasz.
// Az engine csak ezt ismeri; hogy mögötte claude, más CLI vagy egy felvétel van, nem érdekli.

export interface AgentRequest {
  prompt: string;
  systemPrompt: string;
  jsonSchema: object; // a válasz kötelező alakja
  allowedTools: string[];
  model?: string;
  timeoutMs: number;
  cwd: string;
  transcriptPath: string; // ide folyik a teljes átirat, kill után is olvasható
}

export interface AgentResult {
  ok: boolean;
  output: unknown; // a strukturált válasz, ha van
  costUsd: number | null;
  error: string | null;
}

export interface Agent {
  readonly kind: string;
  run(request: AgentRequest, seq: number, name: string): Promise<AgentResult>;
}

/** Ezeket a környezeti változókat egyetlen gyerekfolyamat sem kapja meg. */
export const SECRET_ENV = ["TYPESAFE_API_KEY"];

export function filteredEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !SECRET_ENV.includes(k)) env[k] = v;
  }
  return env;
}
