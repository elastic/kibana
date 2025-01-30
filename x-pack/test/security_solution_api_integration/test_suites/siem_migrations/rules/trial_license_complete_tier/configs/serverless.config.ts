/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../config/serverless/config.base';

export default createTestConfig({
  kbnTestServerArgs: [
    `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`, // override to empty array so the flag is not disabled
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
    ])}`,
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'SIEM Migrations Integration Tests - Serverless Env - Complete Tier',
  },
});
