import { ClaudeAgent } from "./engine/agent/ClaudeAgent";
import { ReplayAgent } from "./engine/agent/ReplayAgent";
import { engineState } from "./engine/state";
import { Workflow } from "./engine/Workflow";
import { Workspace } from "./engine/Workspace";
import { Checker } from "./services/Checker";
import { Mailbox } from "./services/Mailbox";
import { replyWorkflow } from "./workflow/graph";
import { ReplyStateSchema, type ReplyState } from "./workflow/state";

// bun adw.ts <ticket> [--resume] [--stop-after <node>]
const root = import.meta.dir;
const [ticketId, ...flags] = process.argv.slice(2);
if (!ticketId) {
  console.error("használat: bun adw.ts <ticket> [--resume] [--stop-after <node>]");
  process.exit(2);
}

const resume = flags.includes("--resume");
const stopAfter = flags.includes("--stop-after") ? flags[flags.indexOf("--stop-after") + 1] : undefined;

const ws = resume ? Workspace.latest(root, ticketId) : Workspace.create(root, ticketId);
// ADW_AGENT=replay: a 01-es (rögzített) futás válaszait játssza vissza, élő hívás nélkül.
const agent =
  process.env.ADW_AGENT === "replay"
    ? new ReplayAgent(new Workspace(root, ticketId, process.env.ADW_REPLAY_FROM ?? "01").dir)
    : new ClaudeAgent();
const def = replyWorkflow({ root, ws, agent, mailbox: new Mailbox(root), checker: new Checker() });
// Folytatáskor a state.json-t is a séma ellenőrzi: sérült fájlra nem indulunk el.
const state: ReplyState = resume
  ? ReplyStateSchema.parse(ws.load())
  : ReplyStateSchema.parse(engineState(ticketId, ws.executionId, def.start));

console.log(`${resume ? "folytatás" : "indítás"}: ${ws.dir} (next: ${state.next})`);
await new Workflow(ws, def).run(state, { stopAfter });
console.log(`vége: status=${state.status} next=${state.next}`);
