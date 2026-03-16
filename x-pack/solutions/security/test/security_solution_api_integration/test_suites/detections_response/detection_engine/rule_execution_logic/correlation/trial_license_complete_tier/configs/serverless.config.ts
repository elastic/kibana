/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExperimentalFeatures as SecuritySolutionExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import { createTestConfig } from '../../../../../../../config/serverless/config.base';

const securitySolutionEnableExperimental: Array<keyof SecuritySolutionExperimentalFeatures> = [
  'correlationRulesEnabled',
];

export default createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Detection Engine - Correlation Rule Execution Logic Integration Tests - Serverless Env - Complete Tier',
  },
  kbnTestServerArgs: [
    `--xpack.securitySolution.enableExperimental=${JSON.stringify(
      securitySolutionEnableExperimental
    )}`,
  ],
});
