import { DecisionNode } from "../engine/DecisionNode";
import { EndNode } from "../engine/EndNode";
import type { WorkflowDef } from "../engine/Workflow";
import { CheckNode } from "./nodes/CheckNode";
import { Escalate } from "./nodes/Escalate";
import { Fetcher } from "./nodes/Fetcher";
import { Fixer } from "./nodes/Fixer";
import { Propose } from "./nodes/Propose";
import { Send } from "./nodes/Send";
import { Summarizer } from "./nodes/Summarizer";
import { Triager } from "./nodes/Triager";
import { Writer } from "./nodes/Writer";
import type { Limits, ReplyContext } from "./ReplyContext";
import type { ReplyState } from "./state";

// A korlátok egy helyen, kódban. ADW_MAX_FIX: demo-felülírás.
export const LIMITS: Limits = { maxFix: Number(process.env.ADW_MAX_FIX ?? 2) };

// A gráf: fetch -> write -> check -> after_check -> (zöld) end
//                             ^                   \-> (piros) fix -> check ...
// Elakadás és kimerült korlát: escalate -> end.
export function replyWorkflow(ctx: ReplyContext): WorkflowDef<ReplyState> {
  const afterTriage = new DecisionNode<ReplyState>("after_triage", [
    { label: "sablon", when: (s) => s.triage?.route === "template", to: "check" },
    { label: "L2/L3", when: (s) => s.triage?.route === "escalate", to: "summarize" },
    { label: "ügynök ír", when: (s) => s.triage?.route === "write", to: "write" },
  ]);
  const afterCheck = new DecisionNode<ReplyState>("after_check", [
    { label: "zöld", when: (s) => s.check?.green === true, to: "gate" },
    { label: "piros", when: (s) => s.check?.green === false, to: "fix" },
  ]);
  // Near the loop: a döntés az emberé, a csatorna ugyanaz a state, mint a node-ok között.
  const gate = new DecisionNode<ReplyState>("gate", [
    { label: "jóváhagyva", when: (s) => s.approval?.decision === "approved", to: "send" },
    { label: "elutasítva", when: (s) => s.approval?.decision === "rejected", to: "fix" },
    { label: "döntésre vár", when: () => true, to: "propose" },
  ]);
  return {
    nodes: [
      new Fetcher(ctx, "triage"),
      new Triager(ctx, "after_triage"),
      afterTriage,
      new Summarizer(ctx, "escalate"),
      new Writer(ctx, "check"),
      new CheckNode(ctx, "after_check"),
      afterCheck,
      new Fixer(ctx, "check"),
      gate,
      new Propose(ctx, "gate"),
      new Send(ctx, "end"),
      new Escalate(ctx, "end"),
      new EndNode("end"),
    ],
    start: "fetch",
    end: "end",
    failure: "escalate",
  };
}
