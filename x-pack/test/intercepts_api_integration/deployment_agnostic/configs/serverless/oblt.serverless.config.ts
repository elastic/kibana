/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../../../api_integration/deployment_agnostic/default_configs/serverless.config.base';
import { services } from '../../../services';

export default createServerlessTestConfig({
  serverlessProject: 'oblt',
  services,
  testFiles: [require.resolve('./oblt.index.ts')],
  junit: {
    reportName: 'Serverless Observability - Intercepts Deployment-agnostic API Integration Tests',
  },
});
