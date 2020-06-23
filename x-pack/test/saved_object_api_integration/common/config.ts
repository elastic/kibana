/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolveKibanaPath } from '@kbn/plugin-helpers';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import path from 'path';
import { services } from './services';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
}

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [] } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const config = {
      kibana: {
        api: await readConfigFile(resolveKibanaPath('test/api_integration/config.js')),
        functional: await readConfigFile(require.resolve('../../../../test/functional/config.js')),
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.ts')),
      },
    };

    return {
      testFiles: [require.resolve(`../${name}/apis/`)],
      servers: config.xpack.api.get('servers'),
      services,
      junit: {
        reportName: 'X-Pack Saved Object API Integration Tests -- ' + name,
      },

      esArchiver: {
        directory: path.join(__dirname, 'fixtures', 'es_archiver'),
      },

      esTestCluster: {
        ...config.xpack.api.get('esTestCluster'),
        license,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${!disabledPlugins.includes('security')}`,
        ],
      },

      kbnTestServer: {
        ...config.xpack.api.get('kbnTestServer'),
        serverArgs: [
          ...config.xpack.api.get('kbnTestServer.serverArgs'),
          '--optimize.enabled=false',
          '--server.xsrf.disableProtection=true',
          `--plugin-path=${path.join(__dirname, 'fixtures', 'saved_object_test_plugin')}`,
          ...disabledPlugins.map((key) => `--xpack.${key}.enabled=false`),
        ],
      },
    };
  };
}
