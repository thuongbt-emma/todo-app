// Restores Next.js route-group / dynamic-route folder names that scripts/make-upload.sh
// encoded for Dokploy zip uploads:
//   _LP_ -> "(",  _RP_ -> ")",  _LB_ -> "[",  _RB_ -> "]",  _DOTS_ -> "..."
// Usage: node scripts/restore-routes.mjs [src/app]   (no-op when nothing is encoded)
import { cpSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'src/app';
const decode = (name) =>
  name
    .replaceAll('_DOTS_', '...')
    .replaceAll('_LP_', '(')
    .replaceAll('_RP_', ')')
    .replaceAll('_LB_', '[')
    .replaceAll('_RB_', ']');

// copy + remove instead of rename: inside a Docker build, renaming a directory that
// was created in an earlier layer fails on overlayfs with EXDEV.
function move(from, to) {
  cpSync(from, to, { recursive: true });
  rmSync(from, { recursive: true, force: true });
}

// children first (deepest first), so parent renames don't invalidate child paths
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    const decoded = decode(entry);
    if (decoded !== entry) {
      move(full, path.join(dir, decoded));
      console.log(`restored ${full} -> ${decoded}`);
    }
  }
}

try {
  statSync(root);
} catch {
  process.exit(0);
}
walk(root);
