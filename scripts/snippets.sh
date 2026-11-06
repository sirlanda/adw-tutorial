#!/usr/bin/env bash
# A slide-okhoz: branch-páronként a kód-diff és a rögzített futás fájljai a
# slides/snippets/<n>/ mappába. Segédanyag a slide-ok írásához, nem a repo része.
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-slides/snippets}"
branches=(main 01-workflow 02-typed-io 03-exec-node 04-agent-node 05-loop-limits 06-triage 07-near-the-loop 08-off-the-loop)
for i in $(seq 1 8); do
  prev="${branches[$((i-1))]}"; cur="${branches[$i]}"
  dir="$out/0$i"; mkdir -p "$dir"
  # kód-diff, a .adw nyom és a lockfile nélkül
  git diff "$prev".."$cur" --stat -- . ':!.adw' ':!bun.lock' ':!outbox' ':!sent' > "$dir/stat.txt"
  git diff "$prev".."$cur" -- . ':!.adw' ':!bun.lock' ':!outbox' ':!sent' > "$dir/full.diff"
  # a branch teljes fájljai külön (a slide ezekből vág ki régiót)
  git ls-tree -r --name-only "$cur" -- engine services workflow prompts adw.ts hook.ts systemprompt.md 2>/dev/null | while read -r f; do
    mkdir -p "$dir/src/$(dirname "$f")"; git show "$cur:$f" > "$dir/src/$f"
  done
done
echo "kész: $out"
