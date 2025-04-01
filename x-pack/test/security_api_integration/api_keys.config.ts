/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const httpBearerAPITestsConfig = await readConfigFile(require.resolve('./http_bearer.config.ts'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
    testFiles: [require.resolve('./tests/api_keys')],
    servers: httpBearerAPITestsConfig.get('servers'),
    security: httpBearerAPITestsConfig.get('security'),
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Api Keys)',
    },

    esTestCluster: httpBearerAPITestsConfig.get('esTestCluster'),
    kbnTestServer: httpBearerAPITestsConfig.get('kbnTestServer'),
  };
}
