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
      require.resolve('../../common/discover/group1'),
      require.resolve('../../common/discover/group2'),
      require.resolve('../../common/discover/group3'),
      require.resolve('../../common/discover/group4'),
      require.resolve('../../common/discover/group5'),
      require.resolve('../../common/discover/group6'),
    ],
    junit: {
      reportName: 'Serverless Security Functional Tests - Common Group 5',
    },
  };
}
