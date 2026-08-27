import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(here, '..');
export const PACKS_ROOT =
  process.env.XSOAR_PACKS_ROOT ?? '/Users/agusruidiaz/Documents/Security/content/Packs';
export const CORPUS_ROOT = path.join(PROJECT_ROOT, 'corpus');
export const EXCLUDED_PACKS = new Set(['DeprecatedContent']);

export const corpusDirs = {
  ir: path.join(CORPUS_ROOT, 'ir'),
  yaml: path.join(CORPUS_ROOT, 'yaml'),
  inventory: path.join(CORPUS_ROOT, 'inventory'),
  analysis: path.join(CORPUS_ROOT, 'analysis'),
  telemetry: path.join(CORPUS_ROOT, 'telemetry'),
};

export function ensureCorpusDirs(): void {
  for (const dir of Object.values(corpusDirs)) {
    mkdirSync(dir, { recursive: true });
  }
}
