/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';

import { services as apiIntegrationServices } from '../../api_integration/services';
import { services as commonServices } from '../../common/services';

export const services = {
  ...commonServices,
  esSupertest: apiIntegrationServices.esSupertest,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
};
// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(
    require.resolve('../../api_integration/config.ts')
  );

  const readOnlyObjectsPlugin = resolve(
    __dirname,
    '../common/plugins/read_only_objects_test_plugin'
  );

  return {
    testFiles: [resolve(__dirname, './apis/spaces/read_only_objects.ts')],
    services,
    servers: xPackAPITestsConfig.get('servers'),
    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [...xPackAPITestsConfig.get('esTestCluster.serverArgs')],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${readOnlyObjectsPlugin}`,
      ],
    },

    junit: {
      reportName: 'X-Pack API Integration Tests (Read Only Saved Objects)',
    },
  };
}
