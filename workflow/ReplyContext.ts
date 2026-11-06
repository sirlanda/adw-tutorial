import type { RunContext } from "../engine/RunContext";
import type { Checker } from "../services/Checker";
import type { Jev } from "../services/Jev";
import type { Mailbox } from "../services/Mailbox";
import type { Templates } from "../services/Templates";

export interface Limits {
  maxFix: number; // ennyi javítási kör után az ügy emberhez megy
}

// A válaszlevél-workflow futási környezete: az engine ctx plusz a service-ek.
// A node-ok innen kapnak mindent, ezért egy fake Mailbox-szal LLM és hálózat nélkül tesztelhetők.
export interface ReplyContext extends RunContext {
  mailbox: Mailbox;
  checker: Checker;
  templates: Templates;
  jev: Jev;
  limits: Limits;
}
