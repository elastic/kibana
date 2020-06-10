/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional_endpoint/config.ts')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    testFiles: [resolve(__dirname, './apps/endpoint')],
    junit: {
      reportName: 'X-Pack Endpoint Without Ingest Functional Tests',
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        // use a bogus port so the ingest manager setup will fail
        '--xpack.ingestManager.epm.registryUrl=http://127.0.0.1:12345',
      ],
    },
  };
}
