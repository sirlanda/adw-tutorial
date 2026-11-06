import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Egy futás egy repón. A párhuzamos futások ugyanarra az outbox/sent mappára írnának.
export class RunLock {
  private readonly file: string;

  constructor(root: string) {
    this.file = join(root, ".adw", "lock");
  }

  acquire(): void {
    if (existsSync(this.file)) {
      const pid = Number(readFileSync(this.file, "utf8"));
      if (alive(pid)) throw new Error(`másik futás él (pid ${pid}): ${this.file}`);
    }
    writeFileSync(this.file, String(process.pid));
  }

  release(): void {
    if (existsSync(this.file)) rmSync(this.file);
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
