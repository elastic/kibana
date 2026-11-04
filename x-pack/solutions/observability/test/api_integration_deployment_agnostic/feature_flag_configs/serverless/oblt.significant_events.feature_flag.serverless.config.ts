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
  uiamCertProjectType: 'observability',
  testFiles: [require.resolve('./oblt.significant_events.feature_flag.index.ts')],
  kbnServerArgs: [
    `--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`,
    '--xpack.alerting_v2.enabled=true',
    '--uiSettings.globalOverrides.alerting:v2:enabled=true',
    // The detection engine only runs as a service account, and the suite sets the space up to do
    // so. UIAM is already on in the base Serverless config.
    '--xpack.security.serviceAccounts.enabled=true',
    // A UIAM service account that schedules a task gets a UIAM API key and no Elasticsearch key,
    // and Task Manager only grants UIAM keys when this is on.
    '--xpack.task_manager.grant_uiam_api_keys=true',
  ],
  junit: {
    reportName: 'Serverless Observability - Significant Events API Integration Tests',
  },
});
