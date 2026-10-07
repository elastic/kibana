/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { v4 as uuid } from 'uuid';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

// Use a unique absolute state path outside the checkout for each isolated stack invocation.
if (!process.env.OSQUERY_TRAP_STATE_PATH || !Path.isAbsolute(process.env.OSQUERY_TRAP_STATE_PATH)) {
  throw new Error(
    'OSQUERY_TRAP_STATE_PATH must be an absolute, unused file path outside the checkout'
  );
}

process.env.OSQUERY_TRAP_RUN_ID ??= uuid();
const relativeStatePath = Path.relative(
  Path.resolve(__dirname, '../../../../../..'),
  process.env.OSQUERY_TRAP_STATE_PATH
);
if (!relativeStatePath.startsWith('..') && !Path.isAbsolute(relativeStatePath)) {
  throw new Error('OSQUERY_TRAP_STATE_PATH must be outside the checkout');
}

const config = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals_trap'),
  timeout: 30 * 60_000,
});
const models = config.projects ?? [];
if (!models.length) throw new Error('Osquery trap requires at least one model project');
const setupUse = { ...config.use, ...models[0].use };
const trapConfig: typeof config = {
  ...config,
  projects: [
    {
      name: 'trap-setup',
      testMatch: /global.setup\.ts/,
      teardown: 'trap-teardown',
      use: setupUse,
      timeout: 30 * 60_000,
    },
    {
      name: 'trap-teardown',
      testMatch: /global.teardown\.ts/,
      use: setupUse,
      timeout: 30 * 60_000,
    },
    ...models.map((project) => ({
      ...project,
      dependencies: ['trap-setup'],
      testIgnore: /global\.(setup|teardown)\.ts/,
    })),
  ],
};

export default trapConfig;
