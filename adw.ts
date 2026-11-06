import { Workflow } from "./engine/Workflow";
import { Workspace } from "./engine/Workspace";
import { replyWorkflow } from "./workflow/graph";
import { initialState, type ReplyState } from "./workflow/state";

// bun adw.ts <ticket> [--resume] [--stop-after <node>]
const root = import.meta.dir;
const [ticketId, ...flags] = process.argv.slice(2);
if (!ticketId) {
  console.error("használat: bun adw.ts <ticket> [--resume] [--stop-after <node>]");
  process.exit(2);
}

const def = replyWorkflow(root);
const resume = flags.includes("--resume");
const stopAfter = flags.includes("--stop-after") ? flags[flags.indexOf("--stop-after") + 1] : undefined;

const ws = resume ? Workspace.latest(root, ticketId) : Workspace.create(root, ticketId);
const state = resume ? ws.load<ReplyState>() : initialState(ticketId, ws.executionId, def.start);

console.log(`${resume ? "folytatás" : "indítás"}: ${ws.dir} (next: ${state.next})`);
await new Workflow(ws, def).run(state, { stopAfter });
console.log(`vége: status=${state.status} next=${state.next}`);
