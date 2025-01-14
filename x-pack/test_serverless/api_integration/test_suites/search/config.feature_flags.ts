/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

/**
 * Make sure to create a MKI deployment with custom Kibana image, that includes feature flags arguments
 * This tests most likely will fail on default MKI project
 */
export default createTestConfig({
  serverlessProject: 'es',
  junit: {
    reportName: 'Serverless Search Feature Flags API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSearch'] },
  // add feature flags
  kbnServerArgs: [
    `--xpack.searchIndices.enabled=true`, // global empty state FF
  ],
  // load tests in the index file
  testFiles: [require.resolve('./index.feature_flags.ts')],

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/esproject/config/elasticsearch.yml
  esServerArgs: [],
});
