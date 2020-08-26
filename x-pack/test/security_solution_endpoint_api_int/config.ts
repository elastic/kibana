/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { createEndpointDockerConfig, getRegistryUrlAsArray } from './registry';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    ...xPackAPITestsConfig.getAll(),
    testFiles: [require.resolve('./apis')],
    dockerServers: createEndpointDockerConfig(),
    services,
    junit: {
      reportName: 'X-Pack Endpoint API Integration Tests',
    },
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        // if you return an empty string here the kibana server will not start properly but an empty array works
        ...getRegistryUrlAsArray(),
      ],
    },
  };
}
