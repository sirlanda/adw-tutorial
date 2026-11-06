import { EndNode } from "../engine/EndNode";
import type { RunContext } from "../engine/RunContext";
import type { WorkflowDef } from "../engine/Workflow";
import { Drafter } from "./nodes/Drafter";
import { Fetcher } from "./nodes/Fetcher";
import type { ReplyState } from "./state";

// A gráf: fetch -> draft -> end. Két ExecNode típusos szerződéssel.
export function replyWorkflow(ctx: RunContext): WorkflowDef<ReplyState> {
  return {
    nodes: [new Fetcher(ctx, "draft"), new Drafter(ctx, "end"), new EndNode("end")],
    start: "fetch",
    end: "end",
  };
}
