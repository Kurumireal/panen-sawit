// Panen Sawit — entry program for make.fun best-game-01 (Node 22, stdlib only).
//
// The game itself is the static site in game/ (open game/index.html in a
// browser, no build step, no network). This program hands it in: it copies
// game/ and screenshots/ into the output directory and writes dossier.json
// there with buildDossier from the vendored make.fun library, byte for byte
// the way the scorer rebuilds it.
//
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate so an oversized entry fails here first:
// dossier text 160 KiB, at most 4 screenshots of 256 KiB, game/ at most
// 993 entries / 48 MiB, and no game/ path longer than 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
