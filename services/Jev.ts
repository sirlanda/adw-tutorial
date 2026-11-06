import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { choice, noul, score, TypeSafeClient, type EntryType, type Questions, type SystemOneResult } from "@typesafe-ai/sdk";

export { choice, noul, score };

// Jev (TypeSafe System One): típusos, kalibrált ítéletek egy rövid state fölött. Nem generál,
// nem ír: csak válaszol a kérdésekre, valószínűségekkel. Olcsó és gyors, ezért a drága
// ügynök ELÉ tesszük. Kulcs nélkül vagy hiba esetén null: a hívó az ügynök-útra esik vissza,
// sosem akad el. Minden kérés a jev/<név>.json fájlba is kerül, a replay onnan olvas.
const MODEL = "jev-latest";
const TIMEOUT_MS = 30_000;

export type JevLog = (entry: Record<string, unknown>) => void;

export class Jev {
  constructor(
    private readonly client: TypeSafeClient | null,
    private readonly recordDir: string,
    private readonly replayDir: string | null,
    private readonly log: JevLog,
  ) {}

  static fromEnv(recordDir: string, replayDir: string | null, log: JevLog): Jev {
    const apiKey = (process.env.TYPESAFE_API_KEY ?? "").trim();
    const client = apiKey ? new TypeSafeClient({ apiKey, timeout: TIMEOUT_MS, logLevel: "off", fetch: bunFetch }) : null;
    return new Jev(client, recordDir, replayDir, log);
  }

  async judge<Q extends Questions>(name: string, state: NonNullable<EntryType>, questions: Q): Promise<SystemOneResult<Q>["answers"] | null> {
    const file = (dir: string) => join(dir, "jev", `${name}.json`);
    if (this.replayDir) {
      if (!existsSync(file(this.replayDir))) return null;
      const recorded = JSON.parse(readFileSync(file(this.replayDir), "utf8"));
      this.log({ event: "jev", name, replay: true, answers: recorded.answers });
      return recorded.answers;
    }
    if (!this.client) {
      this.log({ event: "jev_skipped", name, reason: "nincs TYPESAFE_API_KEY" });
      return null;
    }
    const started = Date.now();
    try {
      const r = await this.client.systemOne({ state, questions, model: MODEL });
      mkdirSync(join(this.recordDir, "jev"), { recursive: true });
      writeFileSync(file(this.recordDir), JSON.stringify({ model: r.model, state, answers: r.answers }, null, 2) + "\n");
      this.log({ event: "jev", name, model: r.model, questions: Object.keys(questions).length, input_tokens: r.usage.input_tokens ?? 0, duration_ms: Date.now() - started, answers: r.answers });
      return r.answers;
    } catch (e) {
      this.log({ event: "jev_error", name, error: String(e), duration_ms: Date.now() - started });
      return null;
    }
  }
}

// Bun 1.4 + SDK 0.7.0: az SDK a válasz body-ját kétszer olvasná, a bun ezt nem engedi
// ("Body already used"). A választ egy friss stream-be csomagolva adjuk át.
const bunFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, init);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}) as typeof fetch;
