/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

// The workflow fans out over batches and each batch is a frontier-model call.
export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals/generation_path`,
  timeout: 60 * 60_000,
});
