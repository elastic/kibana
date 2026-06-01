/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/api_integration/config.base';
import { services } from '../services';

export default createTestConfig({
  serverlessProject: 'vectordb',
  services,
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Serverless VectorDB API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlVectorDB'] },

  // include settings from project controller
  esServerArgs: [],
  kbnServerArgs: [],
});
