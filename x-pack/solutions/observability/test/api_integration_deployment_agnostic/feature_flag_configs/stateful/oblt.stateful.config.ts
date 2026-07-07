/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulFeatureFlagTestConfig } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/feature_flag.stateful.config.base';
import { services } from '../../services';

export default createStatefulFeatureFlagTestConfig<typeof services>({
  services,
  testFiles: [require.resolve('./oblt.index.ts')],
  kbnServerArgs: ['--xpack.actions.preconfigured'],
  junit: {
    reportName: 'Stateful Observability - Deployment-agnostic Feature Flag API Integration Tests',
  },
});
