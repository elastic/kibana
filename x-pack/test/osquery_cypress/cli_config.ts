/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { startOsqueryCypress } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const osqueryCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  return {
    ...osqueryCypressConfig.getAll(),

    testRunner: startOsqueryCypress,
  };
}
