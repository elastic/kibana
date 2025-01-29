/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../../../config/serverless/config.base';

export default createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Rules Management - Prebuilt Rule Customization Disabled Integration Tests - Serverless Env Complete Tier',
  },
  kbnTestServerArgs: [],
});
