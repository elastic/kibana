/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Serverless Security API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/security/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.nlp.enabled=true'],
  kbnServerArgs: [
    // disable fleet task that writes to metrics.fleet_server.* data streams, impacting functional tests
    `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
    // useful for testing (also enabled in MKI QA)
    '--coreApp.allowDynamicConfigOverrides=true',
    `--xpack.securitySolutionServerless.cloudSecurityUsageReportingTaskInterval=5s`,
    `--xpack.securitySolutionServerless.usageReportingApiUrl=http://localhost:8081/api/v1/usage`,
  ],
});
