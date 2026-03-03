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
  junit: {
    reportName: 'Serverless Security Cloud Security Functional Tests',
  },

  // load tests in the index file
  testFiles: [require.resolve('../test_suites/ftr/cloud_security_posture/cloud_tests')],
  enableFleetDockerRegistry: false,
});
