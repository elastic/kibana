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
  serverlessProject: 'oblt',
  junit: {
    reportName: 'Serverless Observability Feature Flags Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  // add feature flags
  kbnServerArgs: [
    '--xpack.infra.enabled=true',
    '--xpack.infra.featureFlags.customThresholdAlertsEnabled=true',
    '--xpack.observability.unsafe.thresholdRule.enabled=true',
  ],
  // load tests in the index file
  testFiles: [require.resolve('./index.feature_flags.ts')],

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false', 'xpack.ml.nlp.enabled=false'],
});
