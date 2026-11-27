import path from 'node:path';
import { annotatePlaybook } from './classify.ts';
import { writeAnalysis } from './analysis.ts';
import { createGapAnalysisDashboard } from './create_dashboard.ts';
import { ingestToElastic } from './ingest_es.ts';
import { writeInventory } from './inventory.ts';
import { writeJson } from './json.ts';
import {
  collectNestedPlaybooks,
  discoverPlaybooks,
  buildPlaybookIndex,
  listPackDirs,
  loadPackMeta,
  toBareIr,
} from './parse.ts';
import { CORPUS_ROOT, PACKS_ROOT, corpusDirs, ensureCorpusDirs } from './paths.ts';
import type { PlaybookIR } from './types.ts';
import { writeWorkflowYaml } from './yaml_from_ir.ts';

function packNameDictionary(): string[] {
  const names = new Set<string>();
  for (const dir of listPackDirs()) {
    const meta = loadPackMeta(dir);
    names.add(meta.name);
    for (const dep of meta.dependencies) {
      names.add(dep.displayName);
    }
  }
  return [...names].sort((a, b) => b.length - a.length);
}

function loadAllIrs(): { discoveredCount: number; playbooks: PlaybookIR[]; packNames: string[] } {
  const packNames = packNameDictionary();
  const discovered = discoverPlaybooks();
  const playbooks = discovered.map((item) => annotatePlaybook(toBareIr(item), packNames));
  return { discoveredCount: discovered.length, playbooks, packNames };
}

function writeIrs(playbooks: PlaybookIR[]): void {
  for (const ir of playbooks) {
    const dest = path.join(
      corpusDirs.ir,
      ir.pack,
      `${path.basename(ir.file, path.extname(ir.file)).replace(/[^A-Za-z0-9._-]+/g, '_')}.json`
    );
    writeJson(dest, ir);
  }
}

function parseArgs(argv: string[]): { cmd: string; pack: string | null } {
  const cmd = argv[0] ?? 'help';
  const packIdx = argv.indexOf('--pack');
  const pack = packIdx >= 0 ? argv[packIdx + 1] ?? null : null;
  return { cmd, pack };
}

function runInventory(): PlaybookIR[] {
  ensureCorpusDirs();
  console.log(`Scanning playbooks under ${PACKS_ROOT}`);
  const { playbooks } = loadAllIrs();
  const inventory = writeInventory(PACKS_ROOT, playbooks);
  writeAnalysis(playbooks, 'all non-deprecated playbooks');
  console.log(
    `Wrote ${inventory.summary.playbooks} playbooks, ${inventory.summary.packs} packs, ${inventory.summary.connector_brands} brands → ${corpusDirs.inventory}`
  );
  return playbooks;
}

function runConvert(pack: string): void {
  ensureCorpusDirs();
  const packNames = packNameDictionary();
  const discovered = discoverPlaybooks();
  const index = buildPlaybookIndex(discovered);
  const seeds = discovered.filter((d) => d.pack.folder.toLowerCase() === pack.toLowerCase());
  if (seeds.length === 0) {
    throw new Error(`No non-deprecated playbooks found for pack ${pack}`);
  }

  const related = new Map<string, PlaybookIR>();
  const seedIrs: PlaybookIR[] = [];
  for (const seed of seeds) {
    const ir = annotatePlaybook(toBareIr(seed), packNames);
    seedIrs.push(ir);
    related.set(seed.absPath, ir);
    for (const nested of collectNestedPlaybooks(seed, index)) {
      if (!related.has(nested.absPath)) {
        related.set(nested.absPath, annotatePlaybook(toBareIr(nested), packNames));
      }
    }
  }

  writeIrs(seedIrs);
  for (const ir of seedIrs) {
    const dest = writeWorkflowYaml(ir);
    console.log(`YAML ${dest}`);
  }

  const allRelated = [...related.values()];
  writeAnalysis(allRelated, `${pack} + nested playbooks`, `${pack.toLowerCase()}_`);
  console.log(
    `Converted ${seedIrs.length} ${pack} playbooks; analysis covers ${allRelated.length} playbooks including nested`
  );
}

async function main(): Promise<void> {
  const { cmd, pack } = parseArgs(process.argv.slice(2));
  if (cmd === 'inventory') {
    runInventory();
    return;
  }
  if (cmd === 'convert') {
    runConvert(pack ?? 'Phishing');
    return;
  }
  if (cmd === 'ingest') {
    await ingestToElastic();
    return;
  }
  if (cmd === 'dashboard') {
    await createGapAnalysisDashboard();
    return;
  }
  if (cmd === 'all') {
    runInventory();
    runConvert(pack ?? 'Phishing');
    try {
      await ingestToElastic();
    } catch (error) {
      console.warn(`Ingest skipped/failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }
  console.log(`XSOAR workflow corpus
Usage:
  node --import tsx src/cli.ts inventory
  node --import tsx src/cli.ts convert --pack Phishing
  node --import tsx src/cli.ts ingest
  node --import tsx src/cli.ts dashboard
  node --import tsx src/cli.ts all

PACKS_ROOT=${PACKS_ROOT}
CORPUS_ROOT=${CORPUS_ROOT}
`);
}

await main();
