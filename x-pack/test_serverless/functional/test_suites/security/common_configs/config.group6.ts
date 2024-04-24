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
      require.resolve('../../common/discover/embeddable'),
      require.resolve('../../common/discover/x_pack'),
      // flaky for Security project, should be checked with Admin role permissions.
      // https://github.com/elastic/kibana/issues/172365
      // require.resolve('../../common/discover_ml_uptime/discover'),
      require.resolve('../../common/context'),
    ],
    junit: {
      reportName: 'Serverless Security Functional Tests - Common Group 6',
    },
  };
}
