/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../config.ts'));

  return {
    ...baseTestConfig.getAll(),
    testFiles: [
      require.resolve('../../common/discover/group3'), // 4 min
      require.resolve('../../common/discover/group4'), // 4 min
      require.resolve('../../common/discover/group5'), // 2 min
    ],
    junit: {
      reportName: 'Serverless Search Functional Tests - Common Group 11',
    },
  };
}
