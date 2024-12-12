/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import cypress from 'cypress';
import { FtrProviderContext } from './ftr_provider_context';
import { cypressTestRunner } from './cypress_test_runner';

async function ftrConfigOpen({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaConfig = await readConfigFile(require.resolve('./ftr_config.ts'));
  return {
    ...kibanaConfig.getAll(),
    testRunner,
  };
}

export async function testRunner(ftrProviderContext: FtrProviderContext) {
  await cypressTestRunner({ ftrProviderContext, cypressExecution: cypress.open });
}

// eslint-disable-next-line import/no-default-export
export default ftrConfigOpen;
