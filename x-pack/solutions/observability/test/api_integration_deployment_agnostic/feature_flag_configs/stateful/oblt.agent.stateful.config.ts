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
  testFiles: [require.resolve('./oblt.agent.index.ts')],
  kbnServerArgs: [
    '--uiSettings.overrides.agentBuilder:enabled=true',
    '--feature_flags.overrides.observabilityAgent.enabled=true',
  ],
  junit: {
    reportName:
      'Stateful Observability - Deployment-agnostic Feature Flag Observability Agent API Integration Tests',
  },
  // @ts-expect-error
  kbnTestServer: {
    serverArgs: [
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.observabilityAgent',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
    ],
  },
});
