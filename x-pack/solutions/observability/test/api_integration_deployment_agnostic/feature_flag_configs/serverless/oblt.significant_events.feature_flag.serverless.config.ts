/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { createServerlessFeatureFlagTestConfig } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/feature_flag.serverless.config.base';
import { services } from '../../services';

export default createServerlessFeatureFlagTestConfig<typeof services>({
  services,
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./oblt.significant_events.feature_flag.index.ts')],
  kbnServerArgs: [
    `--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`,
    '--xpack.alerting_v2.enabled=true',
    '--uiSettings.globalOverrides.alerting:v2:enabled=true',
  ],
  junit: {
    reportName: 'Serverless Observability - Significant Events API Integration Tests',
  },
});
