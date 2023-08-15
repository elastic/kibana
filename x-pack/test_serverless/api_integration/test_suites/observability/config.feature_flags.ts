/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';
import { services } from './apm_api_integration/common/services';

export default createTestConfig({
  serverlessProject: 'oblt',
  junit: {
    reportName: 'Serverless Observability Feature Flags API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  services,
  // add feature flags
  kbnServerArgs: [
    `--xpack.alerting.enableFrameworkAlerts=true`,
    '--xpack.observability.unsafe.thresholdRule.enabled=true',
    '--server.publicBaseUrl=https://localhost:5601',
  ],
  // import only tests that require feature flags
  testFiles: [
    require.resolve('./threshold_rule'),
    require.resolve('./apm_api_integration/feature_flags.ts'),
  ],
});
