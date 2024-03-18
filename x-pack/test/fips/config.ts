/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));
  const servers = functionalConfig.get('servers');

  return {
    ...functionalConfig.getAll(),

    servers: {
      ...servers,
      kibana: {
        ...servers.kibana,
        auth: 'kibana_system:changeme',
        username: 'kibana_system',
        password: 'changeme',
      },
    },

    testFiles: [require.resolve('./tests')],

    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      license: 'trial',
      serverArgs: [
        // 'path.repo=/tmp/',
        // 'xpack.security.authc.api_key.enabled=true',
        // 'network.host=0.0.0.0',
        'network.bind_host=127.0.0.1,192.168.56.1',
        'discovery.type=single-node',
      ],
    },

    // kbnTestServer: {
    //   dockerImage:
    //     'docker.elastic.co/kibana-ci/kibana-ubi-fips:8.14.0-SNAPSHOT-e101c22703375e070e5baf576e21465b29071ba2',
    //     'docker.elastic.co/kibana/kibana:8.14.0-SNAPSHOT',
    // },
  };
}
