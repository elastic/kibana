/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  testFiles?: string[];
}

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license, disabledPlugins = [], testFiles } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const config = {
      kibana: {
        api: await readConfigFile(path.resolve(REPO_ROOT, 'test/api_integration/config.js')),
        functional: await readConfigFile(
          require.resolve('@kbn/test-suites-src/functional/config.base')
        ),
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.ts')),
      },
    };

    return {
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles: testFiles ?? [require.resolve(`../${name}/apis/`)],
      servers: config.xpack.api.get('servers'),
      services: {
        es: config.kibana.api.get('services.es'),
        esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
        supertest: config.kibana.api.get('services.supertest'),
        supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
        retry: config.xpack.api.get('services.retry'),
        esArchiver: config.kibana.functional.get('services.esArchiver'),
        kibanaServer: config.kibana.functional.get('services.kibanaServer'),
        spaces: config.xpack.api.get('services.spaces'),
        usageAPI: config.xpack.api.get('services.usageAPI'),
        roleScopedSupertest: services.roleScopedSupertest,
        samlAuth: () => {},
      },
      junit: {
        reportName: 'X-Pack Spaces API Integration Tests -- ' + name,
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
          `--plugin-path=${path.resolve(__dirname, 'plugins/spaces_test_plugin')}`,
          ...disabledPlugins
            .filter((k) => k !== 'security')
            .map((key) => `--xpack.${key}.enabled=false`),
          // Note: we fake a cloud deployment as the solution view is only available in cloud
          '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
          '--xpack.cloud.base_url=https://cloud.elastic.co',
          '--xpack.cloud.deployment_url=/deployments/deploymentId',
        ],
      },
    };
  };
}
