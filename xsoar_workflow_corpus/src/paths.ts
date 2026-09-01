import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(here, '..');
export const PACKS_ROOT =
  process.env.XSOAR_PACKS_ROOT ?? '/Users/agusruidiaz/Documents/Security/content/Packs';
export const CORPUS_ROOT = path.join(PROJECT_ROOT, 'corpus');
export const SEED_ZIP = path.join(PROJECT_ROOT, 'xsoar-workflow-seed.zip');
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

/** Unpack the committed seed zip into `corpus/` when inventory files are missing. */
export function ensureSeedCorpus(): void {
  const summary = path.join(corpusDirs.inventory, 'playbooks_summary.json');
  const full = path.join(corpusDirs.inventory, 'playbooks.json');
  if (existsSync(summary) || existsSync(full)) {
    return;
  }
  if (!existsSync(SEED_ZIP)) {
    throw new Error(
      `No corpus inventory and no seed zip at ${SEED_ZIP}. Run \`inventory\` against an XSOAR Packs clone, or restore xsoar-workflow-seed.zip.`
    );
  }
  ensureCorpusDirs();
  console.log(`Unpacking seed ${SEED_ZIP} → ${CORPUS_ROOT}`);
  execFileSync('unzip', ['-o', SEED_ZIP, '-d', CORPUS_ROOT], { stdio: 'inherit' });
}
