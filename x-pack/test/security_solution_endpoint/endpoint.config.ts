/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';
import { generateConfig } from './config.base';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return generateConfig({
    baseConfig: xpackFunctionalConfig,
    testFiles: [resolve(__dirname, './apps/endpoint')],
    junitReportName: 'X-Pack Endpoint Functional Tests on ESS',
    mochaGrep: '@ess',
  });
}
