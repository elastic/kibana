/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/default_configs/serverless.config.base';
import { services } from '../../services';

export default createServerlessTestConfig<typeof services>({
  services,
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./oblt.ai_agent.index.ts')],
  junit: {
    reportName:
      'Serverless Observability - Deployment-agnostic Observability Agent Builder API Integration Tests',
  },
});
