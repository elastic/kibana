/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/api_integration/config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('../test_suites/cloud_security_posture/graph')],
  junit: {
    reportName: 'Serverless Security API Integration Tests - Graph Complete Tier',
  },
  suiteTags: { exclude: ['skipSvlSec'] },
  kbnServerArgs: [
    `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
    '--coreApp.allowDynamicConfigOverrides=true',
    `--xpack.securitySolutionServerless.cloudSecurityUsageReportingTaskInterval=5s`,
    `--xpack.securitySolutionServerless.usageApi.url=http://localhost:8089`,
    '--xpack.dataUsage.enabled=true',
    '--xpack.dataUsage.enableExperimental=[]',
    '--xpack.dataUsage.autoops.enabled=true',
    '--xpack.dataUsage.autoops.api.url=http://localhost:9000',
    `--xpack.dataUsage.autoops.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.dataUsage.autoops.api.tls.key=${KBN_KEY_PATH}`,
    // Complete tier enables graph visualization product feature
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
    ])}`,
  ],
  enableFleetDockerRegistry: false,
});
