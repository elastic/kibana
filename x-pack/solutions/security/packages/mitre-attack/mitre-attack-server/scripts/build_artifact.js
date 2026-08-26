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
  console.log('Fetching MITRE ATT&CK bundle…');
  const entities = await buildMitreArtifact();

  const counts = {
    tactics: entities.filter((e) => e.type === 'tactic').length,
    techniques: entities.filter((e) => e.type === 'technique').length,
    subtechniques: entities.filter((e) => e.type === 'subtechnique').length,
  };

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(entities, null, 2)}\n`, 'utf-8');

  console.log(`Artifact written to ${ARTIFACT_PATH}`);
  console.log(`  tactics:       ${counts.tactics}`);
  console.log(`  techniques:    ${counts.techniques}`);
  console.log(`  subtechniques: ${counts.subtechniques}`);
  console.log(`  total:         ${entities.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
