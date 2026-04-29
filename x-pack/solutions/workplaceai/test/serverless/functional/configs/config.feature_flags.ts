/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { services } from '../services';

/**
 * Make sure to create a MKI deployment with custom Kibana image, that includes feature flags arguments
 * These tests most likely will fail on default MKI project
 */
export default createTestConfig({
  serverlessProject: 'workplaceai',
  services,
  junit: {
    reportName: 'Serverless Workplace AI Feature Flags Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlWorkplaceAI'] },
  // add feature flags
  kbnServerArgs: [
    // e.g. `--xpack.cloud.id=ES3_FTR_TESTS:ZmFrZS1kb21haW4uY2xkLmVsc3RjLmNvJGZha2Vwcm9qZWN0aWQuZXMkZmFrZXByb2plY3RpZC5rYg==`,
  ],
  // load tests in the index file
  testFiles: [require.resolve('./index.feature_flags.ts')],

  // include settings from project controller
  esServerArgs: [],

  apps: {},
});
