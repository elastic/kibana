/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrConfigProviderContext } from '@kbn/test';
import { svlServices } from './services_edr_workflows';
import { generateConfig } from '../ess/config.base.edr_workflows';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const serverlessTestsConfig = await readConfigFile(
    require.resolve('../../../../test_serverless/shared/config.base.ts')
  );

  return generateConfig({
    baseConfig: serverlessTestsConfig,
    junitReportName: 'X-Pack Endpoint API Integration Tests against Serverless',
    target: 'serverless',
    kbnServerArgs: ['--serverless=security'],
    services: svlServices,
  });
}
