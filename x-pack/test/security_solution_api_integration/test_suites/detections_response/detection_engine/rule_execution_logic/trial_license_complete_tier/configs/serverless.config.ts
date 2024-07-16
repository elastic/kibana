/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTestConfig } from '../../../../../../config/serverless/config.base';

export default createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Detection Engine - Rule Execution Logic Integration Tests - Serverless Env - Complete Tier',
  },
  kbnTestServerArgs: [
    `--xpack.securitySolution.alertIgnoreFields=${JSON.stringify([
      'testing_ignored.constant',
      '/testing_regex*/',
    ])}`, // See tests within the file "ignore_fields.ts" which use these values in "alertIgnoreFields"
    `--xpack.securitySolution.enableExperimental=${JSON.stringify([
      'bulkCustomHighlightedFieldsEnabled',
      'alertSuppressionForMachineLearningRuleEnabled',
      'alertSuppressionForEsqlRuleEnabled',
    ])}`,
  ],
});
