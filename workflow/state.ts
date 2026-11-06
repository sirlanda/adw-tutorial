import type { RunState } from "../engine/Workflow";

export interface Mail {
  ticket_id: string;
  from: string;
  name: string;
  subject: string;
  received_at: string;
  body: string;
}

export interface Reply {
  subject: string;
  body: string;
}

// A válaszlevél-workflow állapota: az engine mezői plusz a saját adataink.
export interface ReplyState extends RunState {
  mail?: Mail;
  draft?: Reply;
}

export function initialState(ticketId: string, executionId: string, start: string): ReplyState {
  return { ticket_id: ticketId, execution_id: executionId, status: "running", next: start };
}
