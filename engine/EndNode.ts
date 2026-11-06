import { Node } from "./Node";
import type { Outcome } from "./Outcome";

// A ciklus vége. A Workflow instanceof-fal ismeri fel, sosem lépteti.
export class EndNode<S> extends Node<S> {
  step(): Promise<Outcome> {
    throw new Error("EndNode.step: a záró node-ot a ciklus nem lépteti");
  }

  targets(): string[] {
    return [];
  }
}
