/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { pageObjects } from '../page_objects';
import { services } from '../services';

export default createTestConfig({
  serverlessProject: 'oblt',
  services,
  pageObjects,
  testFiles: [require.resolve('./index.onboarding.ts')],
  junit: {
    reportName: 'Serverless Observability Onboarding Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // include settings from project controller
  esServerArgs: [],
  kbnServerArgs: [],
  enableFleetDockerRegistry: false,
});
