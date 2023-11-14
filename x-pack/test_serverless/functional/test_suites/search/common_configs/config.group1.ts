/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../config.ts'));
  const functionalConfigBase = baseTestConfig.getAll();

  return {
    ...functionalConfigBase,
    kbnTestServer: {
      ...functionalConfigBase.kbnTestServer,
      serverArgs: [
        ...functionalConfigBase.kbnTestServer.serverArgs,
        // Removing the Observability plugin since the SLO feature now installs
        // an enrich policy by default. The tests expect to start with a fresh
        // install without enrich policies.
        // '--xpack.observability.enabled=false',
      ],
    },
    testFiles: [
      require.resolve('../../common/home_page'),
      require.resolve('../../common/management'),
      require.resolve('../../common/platform_security'),
      require.resolve('../../common/reporting'),
    ],
    junit: {
      reportName: 'Serverless Search Functional Tests - Common Group 1',
    },
  };
}
