/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../default_configs/serverless.config.base';

export default createServerlessTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('./security.index.ts')],
  junit: {
    reportName: 'Serverless Security - Deployment-agnostic API Integration Tests',
  },
});
