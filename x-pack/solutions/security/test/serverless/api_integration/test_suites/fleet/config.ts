/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kbnServerArgs } from '@kbn/test-suites-xpack-platform/serverless/api_integration/services/default_fleet_setup';
import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/api_integration/config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('./fleet')],
  junit: {
    reportName: 'Fleet Serverless Security API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/security/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.nlp.enabled=false'],

  kbnServerArgs,
});
