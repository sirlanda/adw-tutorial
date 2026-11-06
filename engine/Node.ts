import type { Outcome } from "./Outcome";

// A gráf egy csomópontja. Konfigurációt tart (id, hová vezet), futási állapotot nem:
// minden, ami a futásról szól, a state-ben van, ezért a futás bármikor folytatható.
export abstract class Node<S> {
  constructor(readonly id: string) {}

  /** Egy lépés a state fölött. A state-et módosíthatja, a state.next-et nem. */
  abstract step(state: S): Promise<Outcome>;

  /** Az élek célpontjai; a Workflow ezekből ellenőrzi a gráfot indulás előtt. */
  abstract targets(): string[];
}
