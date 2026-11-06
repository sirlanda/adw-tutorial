import type { NavOperations, ShortcutOptions } from "@slidev/types";
import { defineShortcutsSetup } from "@slidev/types";

// `p`: rajzolás (toll) be/ki. A beépített billentyűk maradnak (space, nyilak, o, g, d, esc).
// Rajzolás közben: S toll, L vonal, A nyíl, R téglalap, E ellipszis, 1-6 szín, C törlés, Ctrl+Z vissza.
export default defineShortcutsSetup((nav: NavOperations, base: ShortcutOptions[]) => [
  ...base,
  { name: "toggle_drawing", key: "p", fn: () => nav.toggleDrawing() },
]);
