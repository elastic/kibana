/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { services } from '../services';

export default createTestConfig({
  serverlessProject: 'workplaceai',
  services,
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Serverless Workplace AI Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlWorkplaceAI'] },

  // include settings from project controller
  esServerArgs: [],
  kbnServerArgs: [],

  apps: {},
});
