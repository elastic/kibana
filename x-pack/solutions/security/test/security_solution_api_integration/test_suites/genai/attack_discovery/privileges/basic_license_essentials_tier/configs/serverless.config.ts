/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRECONFIGURED_BEDROCK_ACTION } from '../../../../../../config/shared';
import { createTestConfig } from '../../../../../../config/serverless/config.base';

export default createTestConfig({
  kbnTestServerArgs: [
    `--xpack.securitySolution.enableExperimental=${JSON.stringify([])}`,
    `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
      { product_line: 'security', product_tier: 'essentials' },
      { product_line: 'endpoint', product_tier: 'essentials' },
      { product_line: 'cloud', product_tier: 'essentials' },
    ])}`,
    `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_BEDROCK_ACTION)}`,
    '--coreApp.allowDynamicConfigOverrides=true',
  ],
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'GenAI - Attack Discovery Missing Privileges - Serverless Env - Essentials Tier',
  },
});
