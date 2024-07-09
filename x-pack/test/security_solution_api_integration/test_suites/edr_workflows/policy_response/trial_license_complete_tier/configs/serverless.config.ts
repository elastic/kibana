/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { generateConfig } from '../../../../../edr_workflows/configs/config.base';
import { svlServices } from '../../../../../edr_workflows/services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const serverlessTestsConfig = await readConfigFile(
    require.resolve('../../../../../../../test_serverless/shared/config.base.ts')
  );

  return generateConfig({
    baseConfig: serverlessTestsConfig,
    junitReportName:
      'EDR Workflows - Policy Response Integration Tests - Serverless Env - Complete Licenses',
    target: 'serverless',
    kbnServerArgs: ['--serverless=security'],
    services: svlServices,
    testFiles: [require.resolve('..')],
  });
}
