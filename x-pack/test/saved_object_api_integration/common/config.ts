/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { resolveKibanaPath } from '@kbn/plugin-helpers';
import path from 'path';
import { TestInvoker } from './lib/types';
// @ts-ignore
import { EsProvider } from './services/es';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
}

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [] } = options;

  return async ({ readConfigFile }: TestInvoker) => {
    const config = {
      kibana: {
        api: await readConfigFile(resolveKibanaPath('test/api_integration/config.js')),
        functional: await readConfigFile(require.resolve('../../../../test/functional/config.js')),
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.js')),
      },
    };

    return {
      testFiles: [require.resolve(`../${name}/apis/`)],
      servers: config.xpack.api.get('servers'),
      services: {
        es: EsProvider,
        esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
        supertest: config.kibana.api.get('services.supertest'),
        supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
        esArchiver: config.kibana.functional.get('services.esArchiver'),
        kibanaServer: config.kibana.functional.get('services.kibanaServer'),
      },
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
          `--plugin-path=${path.join(__dirname, 'fixtures', 'namespace_agnostic_type_plugin')}`,
          ...disabledPlugins.map(key => `--xpack.${key}.enabled=false`),
        ],
      },
    };
  };
}
