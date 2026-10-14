#!/bin/sh
# Build a clean upload folder for Dokploy "drop" deployments (zip upload via @lmes/dokploy-cli).
#
# Why: Dokploy's zip extraction rejects (HTTP 500) every entry whose path contains
# "(", ")", "[", "]" or "..", i.e. Next.js route groups such as `(app)` and dynamic
# routes such as `[id]` / `[...all]`. This script exports the committed tree (no
# node_modules, no .env) and encodes those folder names under src/app
# (`(`->`_LP_`, `)`->`_RP_`, `[`->`_LB_`, `]`->`_RB_`, `...`->`_DOTS_`); the Dockerfile
# runs scripts/restore-routes.mjs to put them back before `next build`.
#
# Usage: scripts/make-upload.sh <out-dir> [git-ref]   (default ref: main)
# Then:  dokploy app deploy -a <appId> -p <projectId> -e <envId> -f <out-dir> -y
set -eu
OUT="${1:?out-dir required}"
REF="${2:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rm -rf "$OUT"
mkdir -p "$OUT"
git -C "$ROOT" archive "$REF" | tar -x -C "$OUT"

# Rename deepest paths first so parent renames don't invalidate child paths.
if [ -d "$OUT/src/app" ]; then
  find "$OUT/src/app" -depth \( -name '*[(]*' -o -name '*[)]*' -o -name '*[[]*' -o -name '*[]]*' -o -name '*...*' \) | while IFS= read -r p; do
    dir=$(dirname "$p"); base=$(basename "$p")
    enc=$(printf '%s' "$base" | sed -e 's/\.\.\./_DOTS_/g' -e 's/(/_LP_/g' -e 's/)/_RP_/g' -e 's/\[/_LB_/g' -e 's/\]/_RB_/g')
    mv "$p" "$dir/$enc"
  done
fi

BAD=$(find "$OUT/src/app" \( -name '*[(]*' -o -name '*[)]*' -o -name '*[[]*' -o -name '*[]]*' -o -name '*...*' \) 2>/dev/null || true)
if [ -n "$BAD" ]; then
  echo "ERROR: upload folder still contains a path with ( ) [ ] or ...:" >&2
  echo "$BAD" >&2
  exit 1
fi
echo "Upload folder ready: $OUT"
