/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../deployment_agnostic/serverless.config.base';

export default createServerlessTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Serverless Observability - Painless lab - API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false'],
  kbnServerArgs: [
    // defined in MKI control plane
    '--xpack.uptime.service.manifestUrl=mockDevUrl',
    // useful for testing (also enabled in MKI QA)
    '--coreApp.allowDynamicConfigOverrides=true',
  ],
});
