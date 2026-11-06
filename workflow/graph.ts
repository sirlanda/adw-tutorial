import { DecisionNode } from "../engine/DecisionNode";
import { EndNode } from "../engine/EndNode";
import type { WorkflowDef } from "../engine/Workflow";
import { CheckNode } from "./nodes/CheckNode";
import { Escalate } from "./nodes/Escalate";
import { Fetcher } from "./nodes/Fetcher";
import { Fixer } from "./nodes/Fixer";
import { Writer } from "./nodes/Writer";
import type { Limits, ReplyContext } from "./ReplyContext";
import type { ReplyState } from "./state";

// A korlátok egy helyen, kódban. ADW_MAX_FIX: demo-felülírás.
export const LIMITS: Limits = { maxFix: Number(process.env.ADW_MAX_FIX ?? 2) };

// A gráf: fetch -> write -> check -> after_check -> (zöld) end
//                             ^                   \-> (piros) fix -> check ...
// Elakadás és kimerült korlát: escalate -> end.
export function replyWorkflow(ctx: ReplyContext): WorkflowDef<ReplyState> {
  const afterCheck = new DecisionNode<ReplyState>("after_check", [
    { label: "zöld", when: (s) => s.check?.green === true, to: "end" },
    { label: "piros", when: (s) => s.check?.green === false, to: "fix" },
  ]);
  return {
    nodes: [
      new Fetcher(ctx, "write"),
      new Writer(ctx, "check"),
      new CheckNode(ctx, "after_check"),
      afterCheck,
      new Fixer(ctx, "check"),
      new Escalate(ctx, "end"),
      new EndNode("end"),
    ],
    start: "fetch",
    end: "end",
    failure: "escalate",
  };
}
