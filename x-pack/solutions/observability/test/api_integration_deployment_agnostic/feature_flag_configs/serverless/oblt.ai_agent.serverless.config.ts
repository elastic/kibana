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
  kbnServerArgs: ['--feature_flags.overrides.aiAssistant.aiAgents.enabled=true'],
  testFiles: [require.resolve('./oblt.ai_agent.index.ts')],
  junit: {
    reportName:
      'Serverless Observability - Deployment-agnostic Feature Flag Observability Agent Builder API Integration Tests',
  },
});
