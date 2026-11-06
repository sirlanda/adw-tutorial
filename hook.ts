import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ReplyStateSchema, type ReplyState } from "./workflow/state";

// A poller. Állapotmentes: minden tick az inbox/ és a .adw/ tartalmából vezeti le, mi a
// dolga, ezért bármikor leállítható és újraindítható. Sorban dolgozik, egy futás egy időben.
//   bun hook.ts [--once] [--interval <mp>] [--all]
//   --all: minden levelet újra indít (demo: ADW_AGENT=replay mellett a felvételről, azonnal)
const root = import.meta.dir;
const flags = process.argv.slice(2);
const once = flags.includes("--once");
const all = flags.includes("--all");
const intervalS = Number(flags.includes("--interval") ? flags[flags.indexOf("--interval") + 1] : 60);

function tick(): void {
  const tickets = readdirSync(join(root, "inbox")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
  const fresh = all ? tickets : tickets.filter((t) => !existsSync(join(root, ".adw", t)));
  console.log(`tick: ${tickets.length} levél az inboxban, ${fresh.length} új`);
  for (const ticket of fresh) {
    // Gyerekfolyamat: a futás izolált, a lock és a replay ugyanúgy működik, mint kézből.
    const run = Bun.spawnSync(["bun", join(root, "adw.ts"), ticket], { cwd: root, stdout: "inherit", stderr: "inherit", env: process.env });
    if (run.exitCode !== 0) console.log(`${ticket}: a futás ${run.exitCode} kóddal állt le, a következő tickben nem indul újra (van .adw/ könyvtára)`);
  }
  summary(tickets);
}

/** A tick vége: egy sor ticketenként, a state.json és a log.jsonl alapján. A KPI-k innen jönnek. */
function summary(tickets: string[]): void {
  const rows: string[] = [];
  let agentCalls = 0;
  let auto = 0;
  let waiting = 0;
  for (const t of tickets) {
    const dir = join(root, ".adw", t);
    if (!existsSync(dir)) continue;
    const exec = readdirSync(dir).filter((d) => /^\d+$/.test(d)).sort().at(-1)!;
    const s: ReplyState = ReplyStateSchema.parse(JSON.parse(readFileSync(join(dir, exec, "state.json"), "utf8")));
    const log = readFileSync(join(dir, exec, "log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const calls = log.filter((e) => e.event === "agent").length;
    const approvals = log.filter((e) => e.event === "approval").length;
    agentCalls += calls;
    const outcome = s.sent ? (approvals ? "elküldve (ember hagyta jóvá)" : "elküldve automatikusan") : s.status === "waiting" ? "jóváhagyásra vár" : s.handover ? `átadva (${s.triage?.jev?.support_level ?? "-"})` : s.status;
    if (s.sent && !approvals) auto++;
    if (s.status === "waiting") waiting++;
    rows.push(`| ${t} | ${s.triage?.route ?? "-"} | ${s.triage?.jev?.support_level ?? "-"} | ${s.triage?.jev?.tone ?? "-"} | ${calls} | ${s.iteration} | ${outcome} |`);
  }
  console.log("\n| ticket | út | szint | hangnem | ügynökhívás | iteráció | eredmény |\n|---|---|---|---|---|---|---|");
  console.log(rows.join("\n"));
  console.log(`\nösszesen: ${rows.length} ügy, ${agentCalls} ügynökhívás, ${auto} automatikusan elküldve, ${waiting} emberi döntésre vár\n`);
}

tick();
while (!once) {
  await Bun.sleep(intervalS * 1000);
  tick();
}
