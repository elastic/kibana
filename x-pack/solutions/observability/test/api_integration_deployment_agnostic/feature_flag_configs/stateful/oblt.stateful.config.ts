/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulFeatureFlagTestConfig } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/default_configs/feature_flag.stateful.config.base';
import { services } from '../../services';

export default createStatefulFeatureFlagTestConfig({
  testFiles: [require.resolve('./oblt.index.ts')],
  kbnServerArgs: ['--xpack.actions.preconfigured'],
  services,
  junit: {
    reportName: 'Stateful Observability - Deployment-agnostic Feature Flag API Integration Tests',
  },
});
