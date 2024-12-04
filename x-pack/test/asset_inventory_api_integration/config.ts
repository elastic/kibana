/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    ...xPackAPITestsConfig.getAll(),
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [...xPackAPITestsConfig.get('kbnTestServer.serverArgs')],
    },
    testFiles: [resolve(__dirname, './entity_store')],
    junit: {
      reportName: 'Asset Inventory - Entity Store Integration Tests',
    },
  };
}
