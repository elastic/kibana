/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const { buildMitreArtifact } = require('../src/build_artifact/build_artifact');

const ARTIFACT_PATH = path.join(__dirname, '../artifacts/mitre_artifact.json');

async function main() {
  console.log('Fetching MITRE ATT&CK bundles…');
  const entities = await buildMitreArtifact();

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(entities, null, 2)}\n`, 'utf-8');

  console.log(`Artifact written to ${ARTIFACT_PATH}`);

  // Counts are reported per framework and version so a version that mapped
  // incorrectly is not hidden inside a combined total.
  const countsByVersion = new Map();
  for (const entity of entities) {
    const key = `${entity.framework} v${entity.framework_version}`;
    const counts = countsByVersion.get(key) ?? { tactic: 0, technique: 0, subtechnique: 0 };
    counts[entity.type] += 1;
    countsByVersion.set(key, counts);
  }

  for (const [key, counts] of countsByVersion) {
    const total = counts.tactic + counts.technique + counts.subtechnique;
    console.log(`  ${key}: ${total} entities`);
    console.log(`    tactics:       ${counts.tactic}`);
    console.log(`    techniques:    ${counts.technique}`);
    console.log(`    subtechniques: ${counts.subtechnique}`);
  }

  console.log(`  total: ${entities.length} entities across ${countsByVersion.size} version(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
