/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import { createTestConfig } from '../../../../../config/serverless/config.base';

export default createTestConfig({
  kbnTestServerArgs: [
    // used for connector simulators
    `--xpack.actions.proxyUrl=http://localhost:${(async () =>
      getPort({ port: getPort.makeRange(6200, 6299) }))()}`,
    `--xpack.actions.enabledActionTypes=${JSON.stringify(['.bedrock', '.gen-ai'])}`,
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'GenAI - Invoke AI Tests - Serverless Env - Complete Tier',
  },
});
