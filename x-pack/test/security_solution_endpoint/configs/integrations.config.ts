/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { generateConfig } from './config.base';
import { services } from '../services';

// eslint-disable-next-line import/no-default-export
export default async function (ftrConfigProviderContext: FtrConfigProviderContext) {
  const { readConfigFile } = ftrConfigProviderContext;

  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../../functional/config.base.js')
  );

  return generateConfig({
    ftrConfigProviderContext,
    baseConfig: xpackFunctionalConfig,
    testFiles: [resolve(__dirname, '../apps/integrations')],
    junitReportName: 'X-Pack Endpoint Integrations Functional Tests on ESS',
    target: 'ess',
    kbnServerArgs: [
      // set the packagerTaskInterval to 5s in order to speed up test executions when checking fleet artifacts
      '--xpack.securitySolution.packagerTaskInterval=5s',
    ],
    services,
  });
}
