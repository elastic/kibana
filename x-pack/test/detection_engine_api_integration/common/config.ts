/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
}

// test.not-enabled is specifically not enabled
const enabledActionTypes = [
  '.email',
  '.index',
  '.pagerduty',
  '.server-log',
  '.servicenow',
  '.slack',
  '.webhook',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [], ssl = false } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );
    const servers = {
      ...xPackApiIntegrationTestsConfig.get('servers'),
      elasticsearch: {
        ...xPackApiIntegrationTestsConfig.get('servers.elasticsearch'),
        protocol: ssl ? 'https' : 'http',
      },
    };

    return {
      testFiles: [require.resolve(`../${name}/tests/`)],
      servers,
      services,
      junit: {
        reportName: 'X-Pack Detection Engine API Integration Tests',
      },
      esArchiver: xPackApiIntegrationTestsConfig.get('esArchiver'),
      esTestCluster: {
        ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
        license,
        ssl,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${!disabledPlugins.includes('security')}`,
        ],
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          `--xpack.actions.allowedHosts=${JSON.stringify(['localhost', 'some.non.existent.com'])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          ...disabledPlugins.map((key) => `--xpack.${key}.enabled=false`),
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'alerts')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'actions')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'task_manager')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'aad')}`,
          ...(ssl
            ? [
                `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
                `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
              ]
            : []),
        ],
      },
    };
  };
}
