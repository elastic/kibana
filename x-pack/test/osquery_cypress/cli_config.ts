/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// force cypress test run

import { FtrConfigProviderContext } from '@kbn/test';

import { OsqueryCypressCliTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const osqueryCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...osqueryCypressConfig.getAll(),

    testRunner: OsqueryCypressCliTestRunner,
  };
}
