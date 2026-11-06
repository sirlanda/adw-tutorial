import { DecisionNode } from "../engine/DecisionNode";
import { EndNode } from "../engine/EndNode";
import type { WorkflowDef } from "../engine/Workflow";
import { CheckNode } from "./nodes/CheckNode";
import { Fetcher } from "./nodes/Fetcher";
import { Writer } from "./nodes/Writer";
import type { ReplyContext } from "./ReplyContext";
import type { ReplyState } from "./state";

// A gráf: fetch -> write -> check -> after_check -> end. A sablon helyén ügynök ír.
// A kapu kódban dönt: zöld válasz mehet tovább, a pirosra (még) nincs ág, a futás elakad.
export function replyWorkflow(ctx: ReplyContext): WorkflowDef<ReplyState> {
  const afterCheck = new DecisionNode<ReplyState>("after_check", [
    { label: "zöld", when: (s) => s.check?.green === true, to: "end" },
  ]);
  return {
    nodes: [new Fetcher(ctx, "write"), new Writer(ctx, "check"), new CheckNode(ctx, "after_check"), afterCheck, new EndNode("end")],
    start: "fetch",
    end: "end",
  };
}
