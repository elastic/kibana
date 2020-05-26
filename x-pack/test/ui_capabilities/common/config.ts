/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

import { services } from './services';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
}

// eslint-disable-next-line import/no-default-export
export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [] } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackFunctionalTestsConfig = await readConfigFile(
      require.resolve('../../functional/config.js')
    );

    return {
      testFiles: [require.resolve(`../${name}/tests/`)],
      servers: xPackFunctionalTestsConfig.get('servers'),
      services,
      junit: {
        reportName: 'X-Pack UI Capabilities Functional Tests',
      },
      esArchiver: {},
      esTestCluster: {
        ...xPackFunctionalTestsConfig.get('esTestCluster'),
        license,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${!disabledPlugins.includes('security') && license === 'trial'}`,
        ],
      },
      kbnTestServer: {
        ...xPackFunctionalTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
          ...disabledPlugins.map((key) => `--xpack.${key}.enabled=false`),
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'foo_plugin')}`,
        ],
      },
    };
  };
}
