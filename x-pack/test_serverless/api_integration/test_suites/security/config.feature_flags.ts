/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  junit: {
    reportName: 'Serverless Security Feature Flags API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },
  // add feature flags
  kbnServerArgs: [],
  // import only tests that require feature flags
  testFiles: [require.resolve('./feature_flag_test_suite_template')],
});
