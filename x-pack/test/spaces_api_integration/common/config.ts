/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

import { TestInvoker } from './lib/types';
// @ts-ignore
import { LegacyEsProvider } from './services/legacy_es';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
}

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license, disabledPlugins = [] } = options;

  return async ({ readConfigFile }: TestInvoker) => {
    const config = {
      kibana: {
        api: await readConfigFile(path.resolve(REPO_ROOT, 'test/api_integration/config.js')),
        functional: await readConfigFile(require.resolve('../../../../test/functional/config.js')),
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.ts')),
      },
    };

    return {
      testFiles: [require.resolve(`../${name}/apis/`)],
      servers: config.xpack.api.get('servers'),
      services: {
        legacyEs: LegacyEsProvider,
        esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
        supertest: config.kibana.api.get('services.supertest'),
        supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
        retry: config.xpack.api.get('services.retry'),
        esArchiver: config.kibana.functional.get('services.esArchiver'),
        kibanaServer: config.kibana.functional.get('services.kibanaServer'),
      },
      junit: {
        reportName: 'X-Pack Spaces API Integration Tests -- ' + name,
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
          // disable anonymouse access so that we're testing both on and off in different suites
          '--status.allowAnonymous=false',
          '--server.xsrf.disableProtection=true',
          `--plugin-path=${path.join(__dirname, 'fixtures', 'spaces_test_plugin')}`,
          ...disabledPlugins.map((key) => `--xpack.${key}.enabled=false`),
        ],
      },
    };
  };
}
