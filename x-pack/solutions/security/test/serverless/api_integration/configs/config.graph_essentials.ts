/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/api_integration/config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('../test_suites/cloud_security_posture/graph.essentials')],
  junit: {
    reportName: 'Serverless Security API Integration Tests - Graph Essentials Tier',
  },
  suiteTags: { exclude: ['skipSvlSec'] },
  kbnServerArgs: [
    // Essentials tier does NOT include graph visualization product feature
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'essentials' },
      { product_line: 'endpoint', product_tier: 'essentials' },
      { product_line: 'cloud', product_tier: 'essentials' },
    ])}`,
  ],
  enableFleetDockerRegistry: false,
});
