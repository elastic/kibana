/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test';

import path from 'path';
import fs from 'fs';
import { services } from './services';
import { getAllExternalServiceSimulatorPaths } from '../../alerting_api_integration/common/plugins/actions_simulators/server/plugin';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
  testFiles?: string[];
  publicBaseUrl?: boolean;
}

const enabledActionTypes = [
  '.cases-webhook',
  '.email',
  '.index',
  '.jira',
  '.pagerduty',
  '.swimlane',
  '.resilient',
  '.server-log',
  '.servicenow',
  '.servicenow-sir',
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
  const { license = 'trial', disabledPlugins = [], ssl = false, testFiles = [] } = options;

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

    // Find all folders in ./plugins since we treat all them as plugin folder
    const pluginDir = path.resolve(__dirname, 'plugins');
    const pluginPaths = fs
      .readdirSync(pluginDir)
      .map((n) => path.resolve(pluginDir, n))
      .filter((p) => fs.statSync(p));

    // This is needed so that we can correctly use the alerting test frameworks mock implementation for the connectors.
    const alertingPluginDir = path.resolve(
      __dirname,
      '../../alerting_api_integration/common/plugins'
    );
    const alertingPluginsPaths = fs
      .readdirSync(alertingPluginDir)
      .map((n) => path.resolve(alertingPluginDir, n))
      .filter((p) => fs.statSync(p));

    return {
      testFiles,
      servers,
      services,
      junit: {
        reportName: 'X-Pack Case API Integration Tests',
      },
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
          ...(options.publicBaseUrl ? ['--server.publicBaseUrl=https://localhost:5601'] : []),
          `--xpack.actions.allowedHosts=${JSON.stringify(['localhost', 'some.non.existent.com'])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          ...disabledPlugins
            .filter((k) => k !== 'security')
            .map((key) => `--xpack.${key}.enabled=false`),
          ...pluginPaths.concat(alertingPluginsPaths).map((p) => `--plugin-path=${p}`),
          `--xpack.actions.preconfigured=${JSON.stringify({
            'preconfigured-servicenow': {
              name: 'preconfigured-servicenow',
              actionTypeId: '.servicenow',
              config: {
                apiUrl: 'https://example.com',
                usesTableApi: false,
              },
              secrets: {
                username: 'elastic',
                password: 'elastic',
              },
            },
          })}`,
          `--server.xsrf.allowlist=${JSON.stringify(getAllExternalServiceSimulatorPaths())}`,
          ...(ssl
            ? [
                `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
                `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
              ]
            : []),
          '--xpack.ruleRegistry.write.enabled=true',
          '--xpack.ruleRegistry.write.cache.enabled=false',
        ],
      },
    };
  };
}
