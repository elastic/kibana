/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../config/serverless/config.base';

export default createTestConfig({
  kbnTestServerArgs: [
    `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`,
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'essentials' },
      { product_line: 'endpoint', product_tier: 'essentials' },
      { product_line: 'cloud', product_tier: 'essentials' },
    ])}`,
  ],
  testFiles: [require.resolve('../../tests')],
  junit: {
    reportName: 'Saved Objects Integration Tests - Serverless Env - Complete Tier',
  },
});
