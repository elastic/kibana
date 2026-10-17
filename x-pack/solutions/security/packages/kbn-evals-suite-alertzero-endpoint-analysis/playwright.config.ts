/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
export default createPlaywrightEvalsConfig({
  testDir: './evals',
  // L3 waits up to 17 minutes for the child workflow; the 5 minute default aborts it first.
  timeout: 30 * 60_000,
});
