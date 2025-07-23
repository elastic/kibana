/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { services } from './services';

export default async ({ readConfigFile }: FtrConfigProviderContext) => {
  const svlSharedConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-serverless/shared/config.base')
  );

  const configHere = {
    ...svlSharedConfig.getAll(),
    testConfigCategory: ScoutTestRunConfigCategory.UNKNOWN,
    services: {
      ...services,
    },
    servers: {
      ...svlSharedConfig.get('servers'),
      kibana: {
        ...svlSharedConfig.get('servers.kibana'),
        port: '5601',
      },
      elasticsearch: {
        ...svlSharedConfig.get('servers.elasticsearch'),
        port: '9200',
      },
    },
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--serverless=security',
        '--elasticsearch.hosts=https://localhost:9200',
        '--server.port=5601',
        '--server.publicBaseUrl=http://localhost:5601',
      ],
      env: {
        ...svlSharedConfig.get('kbnTestServer.env'),
      },
    },
  };

  console.log('configHere', JSON.stringify(configHere, null, 2));
  return configHere;
};
