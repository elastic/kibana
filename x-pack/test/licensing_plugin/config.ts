/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './services';

const license = 'basic';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

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
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [require.resolve('./server')],
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
        '--xpack.licensing.api_polling_frequency=100',
      ],
    },

    apps: {
      ...functionalTestsConfig.get('apps'),
    },
  };
}
