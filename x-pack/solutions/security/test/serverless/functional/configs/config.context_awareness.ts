/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { services } from '../services';
import { pageObjects } from '../page_objects';

export default createTestConfig({
  serverlessProject: 'security',
  pageObjects,
  services,
  testFiles: [require.resolve('../test_suites/ftr/discover/context_awareness')],
  junit: {
    reportName:
      'Serverless Security Discover Context Awareness Functional Tests - Security Profiles',
  },
  // include settings from project controller
  esServerArgs: [],
});
