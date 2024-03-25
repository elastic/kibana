/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../config/serverless/config.base';

export default createTestConfig({
  kbnTestServerArgs: [
    // used for connector simulators
    `--xpack.actions.proxyUrl=http://localhost:6200`,
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'GenAI - Invoke AI Tests - Serverless Env - Complete Tier',
  },
});
