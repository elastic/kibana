/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { ObservabilityTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlConfig = await readConfigFile(require.resolve('./oblt_config.base.ts'));

  return {
    ...svlConfig.getAll(),
    testRunner: ObservabilityTestRunner,
  };
}
