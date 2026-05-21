/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Each example now drives a full Agent Builder `converse` round-trip
  // (tool loop: list_indices / get_index_mapping / generate_esql) plus
  // up to 4 quality evaluators + 5 trace-based evaluators. 30 min for
  // the whole 31-example suite leaves headroom for slow/larger models.
  timeout: 30 * 60_000,
});

// Agent loops introduce LLM-side timing variance (parallel tool calls,
// occasional rate-limit retries). Two retries match the alerts-rag suite's
// budget and keep the suite robust against transient failures without
// masking real regressions.
config.retries = 2;

export default config;
