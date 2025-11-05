/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessFeatureFlagTestConfig } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/feature_flag.serverless.config.base';
import { services } from '../../services';

export default createServerlessFeatureFlagTestConfig<typeof services>({
  services,
  serverlessProject: 'oblt',
  kbnServerArgs: [
    '--xpack.actions.preconfigured',
    '--xpack.alerting.rules.minimumScheduleInterval.value="1s"',
  ],
  testFiles: [require.resolve('./oblt.index.ts')],
  junit: {
    reportName: 'Serverless Observability - Deployment-agnostic Feature Flag API Integration Tests',
  },
});
