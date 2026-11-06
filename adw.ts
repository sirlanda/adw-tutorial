import { ClaudeAgent } from "./engine/agent/ClaudeAgent";
import { ReplayAgent } from "./engine/agent/ReplayAgent";
import { engineState } from "./engine/state";
import { Workflow } from "./engine/Workflow";
import { Workspace } from "./engine/Workspace";
import { Checker } from "./services/Checker";
import { Jev } from "./services/Jev";
import { Mailbox } from "./services/Mailbox";
import { Sender } from "./services/Sender";
import { Templates } from "./services/Templates";
import { LIMITS, replyWorkflow } from "./workflow/graph";
import { ReplyStateSchema, type ReplyState } from "./workflow/state";

// bun adw.ts <ticket> [--resume | --approve | --reject "jegyzet" | --status] [--stop-after <node>]
const root = import.meta.dir;
const [ticketId, ...flags] = process.argv.slice(2);
if (!ticketId) {
  console.error('használat: bun adw.ts <ticket> [--resume | --approve | --reject "jegyzet" | --status] [--stop-after <node>]');
  process.exit(2);
}

if (flags.includes("--status")) {
  const s = ReplyStateSchema.parse(Workspace.latest(root, ticketId).load());
  console.log(`${s.ticket_id}/${s.execution_id}: status=${s.status} next=${s.next} iteration=${s.iteration} route=${s.triage?.route ?? "-"}`);
  if (s.status === "waiting" && s.proposal) console.log(`javaslat: ${s.proposal}`);
  if (s.sent) console.log(`elküldve: ${s.sent}`);
  if (s.handover) console.log(`átadva: ${s.handover}`);
  process.exit(0);
}

const approve = flags.includes("--approve");
const reject = flags.includes("--reject");
const resume = flags.includes("--resume") || approve || reject;
const stopAfter = flags.includes("--stop-after") ? flags[flags.indexOf("--stop-after") + 1] : undefined;

const ws = resume ? Workspace.latest(root, ticketId) : Workspace.create(root, ticketId);
// ADW_AGENT=replay: a 01-es (rögzített) futás válaszait játssza vissza, élő hívás nélkül.
const replayDir = process.env.ADW_AGENT === "replay" ? new Workspace(root, ticketId, process.env.ADW_REPLAY_FROM ?? "01").dir : null;
const agent = replayDir ? new ReplayAgent(replayDir) : new ClaudeAgent();
const jev = Jev.fromEnv(ws.dir, replayDir, (entry) => ws.log(entry));
const def = replyWorkflow({ root, ws, agent, jev, mailbox: new Mailbox(root), checker: new Checker(), templates: new Templates(root), sender: new Sender(root), limits: LIMITS });
// Folytatáskor a state.json-t is a séma ellenőrzi: sérült fájlra nem indulunk el.
const state: ReplyState = resume
  ? ReplyStateSchema.parse(ws.load())
  : ReplyStateSchema.parse(engineState(ticketId, ws.executionId, def.start));

// Az emberi döntés ugyanabba a state-be kerül, amiből a node-ok dolgoznak.
if (approve || reject) {
  if (state.status !== "waiting") {
    console.error(`nem vár döntésre: status=${state.status}`);
    process.exit(1);
  }
  const note = reject ? flags[flags.indexOf("--reject") + 1] : undefined;
  state.approval = { decision: approve ? "approved" : "rejected", note, at: new Date().toISOString() };
  state.status = "running";
  ws.log({ event: "approval", ...state.approval });
}

console.log(`${resume ? "folytatás" : "indítás"}: ${ws.dir} (next: ${state.next})`);
await new Workflow(ws, def).run(state, { stopAfter });
console.log(`vége: status=${state.status} next=${state.next}`);
