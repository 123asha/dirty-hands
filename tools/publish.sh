#!/bin/bash
# puts _build/ on the gh-pages branch (GitHub Pages shows dirtyhands.space from it); the working tree and main are not touched
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f _build/index.html ] && [ -f _build/CNAME ] || { echo "run node tools/build.mjs first"; exit 1; }
git fetch -q origin
IDX=$(mktemp); trap 'rm -f "$IDX"' EXIT
GIT_INDEX_FILE=$IDX git --work-tree=_build add -A .
TREE=$(GIT_INDEX_FILE=$IDX git write-tree)
PARENT=$(git rev-parse -q --verify origin/gh-pages || true)
MSG="Published copy of main $(git rev-parse --short HEAD), scripts minified"
C=$(echo "$MSG" | git commit-tree "$TREE" ${PARENT:+-p "$PARENT"})
git push -q origin "$C:refs/heads/gh-pages"
echo "gh-pages -> $C"
