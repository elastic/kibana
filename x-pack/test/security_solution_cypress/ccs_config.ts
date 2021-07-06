/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { SecuritySolutionCypressCcsTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...securitySolutionCypressConfig.getAll(),

    testRunner: SecuritySolutionCypressCcsTestRunner,
  };
}
