/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import { createTestConfig } from '../../../../../config/serverless/config.base';
import { PRECONFIGURED_BEDROCK_ACTION } from '../../../../../config/shared';

const securitySolutionEnableExperimental: Array<keyof ExperimentalFeatures> = [
  'entityAnalyticsEntityStoreV2',
  'entityAnalyticsWatchlistEnabled',
];

export default createTestConfig({
  kbnTestServerArgs: [
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
    ])}`,
    `--xpack.securitySolution.enableExperimental=${JSON.stringify(
      securitySolutionEnableExperimental
    )}`,
    `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Entity Analytics - Risk Score Maintainer Integration Tests - Serverless Env - Complete Tier',
  },
});
