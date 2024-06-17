/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { generateConfig } from './config.base';
import { svlServices } from '../services';

export default async function (ftrConfigProviderContext: FtrConfigProviderContext) {
  const { readConfigFile } = ftrConfigProviderContext;

  const svlBaseConfig = await readConfigFile(
    require.resolve('../../../../../test_serverless/shared/config.base.ts')
  );

  return generateConfig({
    ftrConfigProviderContext,
    baseConfig: svlBaseConfig,
    testFiles: [resolve(__dirname, '../apps/integrations_feature_flag')],
    junitReportName:
      'X-Pack Endpoint Integrations With Feature Flags turned on Functional Tests on ESS',
    target: 'serverless',
    kbnServerArgs: [
      '--serverless=security',
      // set the packagerTaskInterval to 5s in order to speed up test executions when checking fleet artifacts
      '--xpack.securitySolution.packagerTaskInterval=5s',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify(['unifiedManifestEnabled'])}`,
    ],
    services: svlServices,
  });
}
