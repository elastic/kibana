/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';
import { getAllExternalServiceSimulatorPaths } from './fixtures/plugins/actions_simulators';

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
  '.jira',
  '.slack',
  '.webhook',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

// eslint-disable-next-line import/no-default-export
export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const { license = 'trial', disabledPlugins = [], ssl = false } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.js')
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
        reportName: 'X-Pack Alerting API Integration Tests',
      },
      esArchiver: xPackApiIntegrationTestsConfig.get('esArchiver'),
      esTestCluster: {
        ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
        license,
        ssl,
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          `xpack.security.enabled=${!disabledPlugins.includes('security') &&
            ['trial', 'basic'].includes(license)}`,
        ],
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          `--xpack.actions.whitelistedHosts=${JSON.stringify([
            'localhost',
            'some.non.existent.com',
          ])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          `--xpack.actions.preconfigured=${JSON.stringify([
            {
              id: 'my-slack1',
              actionTypeId: '.slack',
              name: 'Slack#xyz',
              config: {
                webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
              },
            },
            {
              id: 'custom-system-abc-connector',
              actionTypeId: 'system-abc-action-type',
              name: 'SystemABC',
              config: {
                xyzConfig1: 'value1',
                xyzConfig2: 'value2',
                listOfThings: ['a', 'b', 'c', 'd'],
              },
              secrets: {
                xyzSecret1: 'credential1',
                xyzSecret2: 'credential2',
              },
            },
            {
              id: 'preconfigured-es-index-action',
              actionTypeId: '.index',
              name: 'preconfigured_es_index_action',
              config: {
                index: 'functional-test-actions-index-preconfigured',
                refresh: true,
                executionTimeField: 'timestamp',
              },
            },
            {
              id: 'preconfigured.test.index-record',
              actionTypeId: 'test.index-record',
              name: 'Test:_Preconfigured_Index_Record',
              config: {
                unencrypted: 'ignored-but-required',
              },
              secrets: {
                encrypted: 'this-is-also-ignored-and-also-required',
              },
            },
          ])}`,
          ...disabledPlugins.map(key => `--xpack.${key}.enabled=false`),
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'alerts')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'actions_simulators')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'task_manager')}`,
          `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'aad')}`,
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
