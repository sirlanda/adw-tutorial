// Egy node lépésének eredménye. A node SOHA nem írja a state.next-et: csak megmondja, merre
// menne tovább, vagy hogy elakadt. A döntés a cikluson (Workflow.run) múlik.

export type Failure =
  | { kind: "stuck"; reason: string } // nem tud továbblépni (hiányzó adat, érvénytelen válasz)
  | { kind: "max_reached"; reason: string }; // egy korlát (iteráció, idő) elfogyott

export type Outcome = { kind: "next"; to: string } | Failure;

export const next = (to: string): Outcome => ({ kind: "next", to });
export const stuck = (reason: string): Failure => ({ kind: "stuck", reason });
