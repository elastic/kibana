/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { writeFileSync } = require('fs');

const {
  generateSettingsContractSnapshot,
} = require('../server/managed_workflows/workers/test_helpers/generate_settings_contract_snapshot');

try {
  const { destination, contents } = generateSettingsContractSnapshot(process.argv.slice(2));
  writeFileSync(destination, contents);
  process.stdout.write(`Wrote ${destination}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
