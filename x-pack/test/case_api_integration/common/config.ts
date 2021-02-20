/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

import path from 'path';
import fs from 'fs';
import { services } from './services';
import { getAllExternalServiceSimulatorPaths } from '../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
}

// test.not-enabled is specifically not enabled
const enabledActionTypes = [
  '.email',
  '.index',
  '.jira',
  '.pagerduty',
  '.resilient',
  '.server-log',
  '.servicenow',
  '.slack',
  '.webhook',
  '.case',
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

    const allFiles = fs.readdirSync(
      path.resolve(
        __dirname,
        '..',
        '..',
        'alerting_api_integration',
        'common',
        'fixtures',
        'plugins'
      )
    );
    const plugins = allFiles.filter((file) =>
      fs
        .statSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'alerting_api_integration',
            'common',
            'fixtures',
            'plugins',
            file
          )
        )
        .isDirectory()
    );

    return {
      testFiles: [require.resolve(`../${name}/tests/`)],
      servers,
      services,
      junit: {
        reportName: 'X-Pack Case API Integration Tests',
      },
      esArchiver: xPackApiIntegrationTestsConfig.get('esArchiver'),
      esTestCluster: {
        ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
        license,
        ssl,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${
            !disabledPlugins.includes('security') && ['trial', 'basic'].includes(license)
          }`,
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
          ...plugins.map(
            (pluginDir) =>
              `--plugin-path=${path.resolve(
                __dirname,
                '..',
                '..',
                'alerting_api_integration',
                'common',
                'fixtures',
                'plugins',
                pluginDir
              )}`
          ),
          `--server.xsrf.whitelist=${JSON.stringify(getAllExternalServiceSimulatorPaths())}`,
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
