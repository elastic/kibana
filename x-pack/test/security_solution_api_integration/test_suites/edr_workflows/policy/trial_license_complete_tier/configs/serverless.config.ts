/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/serverless/config.base.edr_workflows')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'EDR Workflows API - Policy Tests - Serverless Env - Complete',
    },
  };
}
