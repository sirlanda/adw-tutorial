import { readFileSync } from "node:fs";

// A prompt egy fájl: frontmatter (allowed-tools, model) és egy törzs {{változókkal}}.
// Hiányzó változó a futás ELŐTT hiba, nem egy csendesen rossz prompt.
export interface PromptFile {
  allowedTools: string[];
  model?: string;
  body: string;
}

export function loadPrompt(path: string): PromptFile {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path}: nincs frontmatter`);
  const front: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) front[key.trim()] = rest.join(":").trim();
  }
  return {
    allowedTools: (front["allowed-tools"] ?? "Read, Glob, Grep").split(",").map((t) => t.trim()),
    model: front["model"],
    body: m[2],
  };
}

export function render(body: string, vars: Record<string, string | number>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (!(key in vars)) throw new Error(`a prompt {{${key}}} változója nincs megadva`);
    return String(vars[key]);
  });
}

export function withError(prompt: string, error: string): string {
  return `${prompt}\n\n## ⚠️ Az előző futásod hibája\n\nA záró JSON nem felelt meg a sémának:\n\n${error}\n\nSzüntesd meg a hibát, és csináld végig újra a feladatot.\n`;
}
