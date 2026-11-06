# ADW tananyag: lépések, futtatás, demo, diák. `just` = lista.
# Minden branchen ugyanez a fájl, a lépésfüggő recepteknél a komment mondja, melyik branchtől él.

set shell := ["bash", "-euo", "pipefail", "-c"]

replay := "ADW_AGENT=replay"

default:
    @just --list --unsorted

# ---------- lépések ----------

# Branchek és az aktuális
branches:
    @git branch --list --format '%(HEAD) %(refname:short)' 'main' '0?-*'

# Ugrás egy lépésre: `just step 3` vagy `just step 03` vagy `just step main` (előtte takarít)
step n:
    #!/usr/bin/env bash
    set -euo pipefail
    just clean
    if [ "{{n}}" = "main" ]; then b=main; else
      b=$(git branch --list --format '%(refname:short)' "$(printf '%02d' $((10#{{n}})))-*")
      [ -n "$b" ] || { echo "nincs ilyen lépés: {{n}}"; exit 1; }
    fi
    git checkout -q "$b"
    echo "== $b"
    [ "$b" = main ] || echo "demo: just demo ${b%%-*}"

# Következő lépés
next:
    @b=$(git branch --show-current); [ "$b" = main ] && just step 1 || just step $(( 10#${b%%-*} + 1 ))

# Előző lépés
prev:
    @b=$(git branch --show-current); n=$(( 10#${b%%-*} - 1 )); [ "$n" -ge 1 ] && just step $n || just step main

# Vissza a rögzített állapotra: tracked fájlok, demo közben keletkezett .adw futások, outbox, sent
clean:
    @git checkout -q -- .
    @git clean -qfd -- .adw outbox sent

# Diff az előző lépéshez képest (kód, a .adw nyom nélkül)
diff:
    #!/usr/bin/env bash
    set -euo pipefail
    cur=$(git branch --show-current); [ "$cur" != main ] || { echo "main: nincs előző lépés"; exit 0; }
    n=$((10#${cur%%-*}))
    prev=$([ "$n" -le 1 ] && echo main || git branch --list --format '%(refname:short)' "$(printf '%02d' $((n-1)))-*")
    git diff "$prev..$cur" --stat -- . ':!.adw' ':!bun.lock' ':!outbox' ':!sent' ':!justfile' ':!slides'

# ---------- futtatás az aktuális lépésen ----------

# Egy levél, rögzített válaszokból (ügynök és Jev replay). Pl. `just run T-1002 --stop-after fetch`
run ticket *args:
    {{replay}} bun adw.ts {{ticket}} {{args}}

# Egy levél élő claude hívással (04-től, kb. 20 s és $0.2)
live ticket *args:
    bun adw.ts {{ticket}} {{args}}

# Folytatás a state.json-ból
resume ticket:
    {{replay}} bun adw.ts {{ticket}} --resume

# Jóváhagyás, elutasítás jegyzettel, állapot (07-től)
approve ticket:
    {{replay}} bun adw.ts {{ticket}} --approve

reject ticket note:
    {{replay}} bun adw.ts {{ticket}} --reject "{{note}}"

status ticket:
    bun adw.ts {{ticket}} --status

# Az egész inbox a pollerrel, replay (08-tól). `--all`: a már feldolgozottakat is újra
hook *args="--all":
    {{replay}} bun hook.ts --once {{args}}

# Poller élő hívással (08-tól, kb. 100 s)
hook-live *args:
    bun hook.ts --once {{args}}

# ---------- nyomok ----------

# state.json egy futásról (alapból az utolsó)
state ticket run="":
    @cat "$(just _run {{ticket}} {{run}})/state.json"

# log.jsonl egy futásról
log ticket run="":
    @cat "$(just _run {{ticket}} {{run}})/log.jsonl"

# A node riportok egy futásról
reports ticket run="":
    @for f in "$(just _run {{ticket}} {{run}})"/reports/*.md; do echo "=== $f"; cat "$f"; echo; done

# Egy futás fájljai
tree ticket run="":
    @find "$(just _run {{ticket}} {{run}})" -type f | sort

_run ticket run="":
    @if [ -n "{{run}}" ]; then echo ".adw/{{ticket}}/{{run}}"; else ls -d .adw/{{ticket}}/* | sort | tail -1; fi

# ---------- demo a parancslap szerint (ITnap20261107.md) ----------

# Egy lépés demója: `just demo 5`. Átvált a branchre, takarít, lefuttatja a parancslapot
demo n:
    @just step {{n}}
    @just demo-$(printf '%02d' $((10#{{n}})))

demo-01:
    rm -rf .adw
    bun adw.ts T-1002 --stop-after fetch
    cat .adw/T-1002/01/state.json
    bun adw.ts T-1002 --resume
    cat .adw/T-1002/01/log.jsonl

demo-02:
    ls .adw/T-1002/01/io .adw/T-1002/01/reports
    cat .adw/T-1002/01/io/2-drafter-output.json
    cat .adw/T-1002/01/reports/2-drafter.md

demo-03:
    cat .adw/T-1002/01/reports/3-checker.md
    tail -2 .adw/T-1002/01/log.jsonl

demo-04:
    {{replay}} bun adw.ts T-1002
    cat .adw/T-1002/01/io/2-writer-input.json
    cat .adw/T-1002/01/reports/3-checker.md
    grep -o '"file_path":"[^"]*"' .adw/T-1002/01/logs/2-writer.jsonl | sort -u

demo-05:
    {{replay}} bun adw.ts T-1003
    ls "$(just _run T-1003)/reports"
    cat .adw/T-1003/01/reports/3-checker.md
    jq -r '.done[]' .adw/T-1003/01/io/4-fixer-output.json
    ADW_MAX_FIX=0 {{replay}} bun adw.ts T-1003
    cat "$(just _run T-1003)/reports/4-escalate.md"

demo-06:
    for t in T-1001 T-1004 T-1003; do {{replay}} bun adw.ts $t; done
    grep '"event":"jev"' .adw/T-1004/01/log.jsonl | jq .answers
    jq .summary .adw/T-1004/01/io/3-summarizer-output.json

demo-07:
    {{replay}} bun adw.ts T-1006
    cat outbox/T-1006.md
    {{replay}} bun adw.ts T-1006 --reject "Kérj szállítási címet és céges adószámot"
    cat outbox/T-1006.md
    {{replay}} bun adw.ts T-1006 --approve
    ls sent

demo-08:
    {{replay}} bun hook.ts --once --all
    {{replay}} bun adw.ts T-1006 --approve
    {{replay}} bun hook.ts --once

# ---------- diák ----------

# Prezentáció indítása (slides/slides.md, böngészőben nyílik; előadói nézet: /presenter)
slides:
    cd slides && bunx slidev slides.md --open

# Export PDF-be (slides/export/)
slides-pdf:
    cd slides && bunx slidev export slides.md --output export/adw.pdf

# Export PNG-be diánként (slides/export/)
slides-png:
    cd slides && bunx slidev export slides.md --format png --output export

# Branch-páronkénti diffek és forrásmásolatok a slides/snippets/ alá (segédanyag)
snippets:
    scripts/snippets.sh

# ---------- karbantartás ----------

# A justfile vagy a slides/ módosítása után: a 01..08 láncot sorban az előzőre rebase-eli (main-ről indulva)
sync:
    #!/usr/bin/env bash
    set -euo pipefail
    [ -z "$(git status --porcelain)" ] || { echo "előbb commit vagy just clean, a fa nem tiszta"; exit 1; }
    cur=$(git branch --show-current)
    prev=main
    for b in $(git branch --list --format '%(refname:short)' '0?-*' | sort); do
      git rebase -q "$prev" "$b" >/dev/null
      echo "$b <- $prev ($(git log --oneline "$prev..$b" | wc -l) commit)"
      prev=$b
    done
    git checkout -q "$cur"
    for b in $(git branch --list --format '%(refname:short)' '0?-*'); do
      [ -z "$(git diff "main..$b" --stat -- justfile slides)" ] || { echo "eltér: $b"; exit 1; }
    done
    echo "ok: justfile és slides/ minden ágon azonos"

# Függőségek: engine és diák
install:
    bun install
    cd slides && bun install

# Típusellenőrzés
check:
    bunx tsc -p tsconfig.json

# Minden rögzített futás visszajátszása az aktuális lépésen (ellenőrzés)
verify:
    #!/usr/bin/env bash
    set -euo pipefail
    for d in .adw/T-*/; do t=$(basename "$d"); echo "== $t"; {{replay}} bun adw.ts "$t" >/dev/null; done
    just clean
    echo ok
