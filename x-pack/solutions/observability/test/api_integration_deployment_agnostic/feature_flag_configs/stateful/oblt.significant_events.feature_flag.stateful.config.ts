/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { createStatefulFeatureFlagTestConfig } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/feature_flag.stateful.config.base';
import { services } from '../../services';

export default createStatefulFeatureFlagTestConfig<typeof services>({
  services,
  testFiles: [require.resolve('./oblt.significant_events.feature_flag.index.ts')],
  // Significant events is gated behind this flag (defaults to false); force it on for these suites.
  // Alerting v2's HTTP API (used for rule lifecycle assertions) is on by default wherever the
  // plugin loads; Significant Events provisioning itself uses the programmatic client.
  kbnServerArgs: [`--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`],
  junit: {
    reportName: 'Stateful Observability - Significant Events API Integration Tests',
  },
});
