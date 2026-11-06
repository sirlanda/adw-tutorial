import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EndNode } from "../engine/EndNode";
import { ScriptNode } from "../engine/ScriptNode";
import type { WorkflowDef } from "../engine/Workflow";
import type { Mail, ReplyState } from "./state";

// A gráf: fetch -> draft -> end. Két ScriptNode, még semmi okos.
export function replyWorkflow(root: string): WorkflowDef<ReplyState> {
  const fetch = new ScriptNode<ReplyState>("fetch", "draft", (state) => {
    const file = join(root, "inbox", `${state.ticket_id}.json`);
    state.mail = JSON.parse(readFileSync(file, "utf8")) as Mail;
  });

  const draft = new ScriptNode<ReplyState>("draft", "end", (state) => {
    state.draft = {
      subject: `Re: ${state.mail!.subject}`,
      body: "Köszönjük levelét, hamarosan válaszolunk.",
    };
  });

  return { nodes: [fetch, draft, new EndNode("end")], start: "fetch", end: "end" };
}
