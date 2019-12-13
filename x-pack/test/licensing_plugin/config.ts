/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services, pageObjects } from './services';

const license = 'basic';

export default async function({ readConfigFile }: FtrConfigProviderContext) {
  const functionalTestsConfig = await readConfigFile(require.resolve('../functional/config.js'));

  const servers = {
    ...functionalTestsConfig.get('servers'),
    elasticsearch: {
      ...functionalTestsConfig.get('servers.elasticsearch'),
    },
    kibana: {
      ...functionalTestsConfig.get('servers.kibana'),
    },
  };

  return {
    testFiles: [require.resolve('./apis')],
    servers,
    services,
    pageObjects,
    junit: {
      reportName: 'License plugin API Integration Tests',
    },

    esTestCluster: {
      ...functionalTestsConfig.get('esTestCluster'),
      license,
      serverArgs: [
        ...functionalTestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...functionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--xpack.licensing.api_polling_frequency=300',
      ],
    },

    apps: {
      ...functionalTestsConfig.get('apps'),
    },
  };
}
