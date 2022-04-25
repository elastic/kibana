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
import { getAllExternalServiceSimulatorPaths } from '../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
  testFiles?: string[];
}

// test.not-enabled is specifically not enabled
const enabledActionTypes = [
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

    // Find all folders in ./fixtures/plugins
    const allFiles = fs.readdirSync(path.resolve(__dirname, 'fixtures', 'plugins'));
    const plugins = allFiles.filter((file) =>
      fs.statSync(path.resolve(__dirname, 'fixtures', 'plugins', file)).isDirectory()
    );

    // This is needed so that we can correctly use the alerting test frameworks mock implementation for the connectors.
    const alertingAllFiles = fs.readdirSync(
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

    const alertingPlugins = alertingAllFiles.filter((file) =>
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
          `--xpack.actions.allowedHosts=${JSON.stringify(['localhost', 'some.non.existent.com'])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          ...disabledPlugins
            .filter((k) => k !== 'security')
            .map((key) => `--xpack.${key}.enabled=false`),
          // Actions simulators plugin. Needed for testing push to external services.
          ...alertingPlugins.map(
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
          ...plugins.map(
            (pluginDir) =>
              `--plugin-path=${path.resolve(__dirname, 'fixtures', 'plugins', pluginDir)}`
          ),
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
