/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../../config/serverless/config.base';
import { getTinyElserServerArgs } from '../../utils/helpers';

export default createTestConfig({
  kbnTestServerArgs: [
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
    ])}`,
    // Point Kibana at the tiny ELSER model installed by `installTinyElser` so the KB index
    // binds `semantic_text` to `pt_tiny_elser_elasticsearch` instead of the full default ELSER.
    ...getTinyElserServerArgs(),
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'GenAI - Knowledge Base Entries Tests - Serverless Env - Complete Tier',
  },
});
