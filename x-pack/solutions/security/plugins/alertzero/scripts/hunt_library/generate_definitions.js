#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates the checked-in Hunt Library POC definitions (plan 18, Phase 0) from the pinned TRADE
 * revision in `frozen_hunts.json` plus the reviewed overlays in `definition_overlays.js`.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/generate_definitions.js \
 *     [--trade ~/dev/detection-rules]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const overlays = require('./definition_overlays');
const frozen = require('./frozen_hunts.json');

const args = process.argv.slice(2);
const tradeIdx = args.indexOf('--trade');
const tradeRoot =
  tradeIdx >= 0 && args[tradeIdx + 1]
    ? args[tradeIdx + 1]
    : path.join(os.homedir(), 'dev', 'detection-rules');
const outDir = path.join(__dirname, '..', '..', 'server', 'hunt_library', 'definitions');

const head = execFileSync('git', ['-C', tradeRoot, 'rev-parse', 'HEAD']).toString().trim();
if (head !== frozen.tradeRevision) {
  throw new Error(`TRADE is at ${head}, but the frozen revision is ${frozen.tradeRevision}`);
}

const readToml = (file) =>
  JSON.parse(
    execFileSync('python3', [
      '-c',
      'import sys,json,tomllib;print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))',
      file,
    ]).toString()
  ).hunt;

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

fs.mkdirSync(outDir, { recursive: true });
for (const stale of fs.readdirSync(outDir).filter((f) => f.endsWith('.json'))) {
  fs.unlinkSync(path.join(outDir, stale));
}

const frozenPaths = new Set(frozen.hunts.map((h) => h.path.replace(/^hunting\//, '')));
for (const overlay of overlays) {
  if (!frozenPaths.has(overlay.tradePath)) {
    throw new Error(`${overlay.tradePath} is not in the frozen hunt list`);
  }
  const trade = readToml(path.join(tradeRoot, 'hunting', overlay.tradePath));

  const definition = {
    id: overlay.id,
    version: 1,
    name: trade.name,
    description: clip(trade.description.trim(), 4000),
    hypothesis: overlay.hypothesis,
    platform: overlay.platform,
    mitreTechniques: trade.mitre || [],
    references: trade.references || [],
    guidance: {
      analystNotes: (trade.notes || []).map((n) => clip(n, 1024)),
      expectedFalsePositives: overlay.expectedFalsePositives,
      suggestedPivots: overlay.suggestedPivots,
    },
    query: {
      id: 'main',
      language: 'esql',
      query: overlay.query,
      resultKind: overlay.resultKind,
      defaultTimeRange: overlays.DEFAULT_TIME_RANGE,
      recommendedColumns: overlay.recommendedColumns,
      requiredIndexPatterns: overlay.requiredIndexPatterns,
      requiredFields: overlay.requiredFields,
      evidenceFields: overlay.evidenceFields,
      adjudicationFields: overlay.adjudicationFields,
      surroundingEventQuery: overlay.surroundingEventQuery,
      occurrence: overlay.occurrence,
    },
    source: {
      kind: 'elastic_seed',
      tradeId: trade.uuid,
      path: `hunting/${overlay.tradePath}`,
      revision: frozen.tradeRevision,
    },
  };

  fs.writeFileSync(
    path.join(outDir, `${overlay.id}.json`),
    `${JSON.stringify(definition, null, 2)}\n`
  );
}
console.log(`Wrote ${overlays.length} definitions to ${outDir}`);
