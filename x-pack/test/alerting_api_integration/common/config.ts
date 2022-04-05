/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import getPort from 'get-port';
import fs from 'fs';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { getAllExternalServiceSimulatorPaths } from './fixtures/plugins/actions_simulators/server/plugin';
import { getTlsWebhookServerUrls } from './lib/get_tls_webhook_servers';

interface CreateTestConfigOptions {
  license: string;
  disabledPlugins?: string[];
  ssl?: boolean;
  enableActionsProxy: boolean;
  verificationMode?: 'full' | 'none' | 'certificate';
  publicBaseUrl?: boolean;
  preconfiguredAlertHistoryEsIndex?: boolean;
  customizeLocalHostSsl?: boolean;
  rejectUnauthorized?: boolean; // legacy
}

// test.not-enabled is specifically not enabled
const enabledActionTypes = [
  '.email',
  '.index',
  '.pagerduty',
  '.swimlane',
  '.server-log',
  '.servicenow',
  '.servicenow-sir',
  '.servicenow-itom',
  '.jira',
  '.resilient',
  '.slack',
  '.webhook',
  '.xmatters',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.delayed',
  'test.rate-limit',
  'test.no-attempts-rate-limit',
  'test.throw',
  'test.excluded',
];

export function createTestConfig(name: string, options: CreateTestConfigOptions) {
  const {
    license = 'trial',
    disabledPlugins = [],
    ssl = false,
    verificationMode = 'full',
    preconfiguredAlertHistoryEsIndex = false,
    customizeLocalHostSsl = false,
    rejectUnauthorized = true, // legacy
  } = options;

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
    const allFiles = fs.readdirSync(path.resolve(__dirname, 'fixtures', 'plugins'));
    const plugins = allFiles.filter((file) =>
      fs.statSync(path.resolve(__dirname, 'fixtures', 'plugins', file)).isDirectory()
    );

    const proxyPort =
      process.env.ALERTING_PROXY_PORT ?? (await getPort({ port: getPort.makeRange(6200, 6299) }));

    // Create URLs of identical simple webhook servers using TLS, but we'll
    // create custom host settings for them below.
    const tlsWebhookServers = await getTlsWebhookServerUrls(6300, 6399);

    // If testing with proxy, also test proxyOnlyHosts for this proxy;
    // all the actions are assumed to be acccessing localhost anyway.
    // If not testing with proxy, set a bogus proxy up, and set the bypass
    // flag for all our localhost actions to bypass it.  Currently,
    // security_and_spaces uses enableActionsProxy: true, and spaces_only
    // uses enableActionsProxy: false.
    const proxyHosts = ['localhost', 'some.non.existent.com'];
    const actionsProxyUrl = options.enableActionsProxy
      ? [
          `--xpack.actions.proxyUrl=http://localhost:${proxyPort}`,
          `--xpack.actions.proxyOnlyHosts=${JSON.stringify(proxyHosts)}`,
          '--xpack.actions.proxyRejectUnauthorizedCertificates=false',
        ]
      : [
          `--xpack.actions.proxyUrl=http://elastic.co`,
          `--xpack.actions.proxyBypassHosts=${JSON.stringify(proxyHosts)}`,
        ];

    // set up custom host settings for webhook ports; don't set one for noCustom
    const customHostSettingsValue = [
      {
        url: tlsWebhookServers.rejectUnauthorizedFalse,
        ssl: {
          verificationMode: 'none',
        },
      },
      {
        url: tlsWebhookServers.rejectUnauthorizedTrue,
        ssl: {
          verificationMode: 'full',
        },
      },
      {
        url: tlsWebhookServers.caFile,
        ssl: {
          verificationMode: 'certificate',
          certificateAuthoritiesFiles: [CA_CERT_PATH],
        },
      },
    ];
    const customHostSettings = customizeLocalHostSsl
      ? [`--xpack.actions.customHostSettings=${JSON.stringify(customHostSettingsValue)}`]
      : [];

    return {
      testFiles: [require.resolve(`../${name}/tests/`)],
      servers,
      services,
      junit: {
        reportName: 'X-Pack Alerting API Integration Tests',
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
          `--xpack.actions.allowedHosts=${JSON.stringify([
            'localhost',
            'some.non.existent.com',
            'smtp.live.com',
          ])}`,
          '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
          '--xpack.alerting.invalidateApiKeysTask.interval="15s"',
          '--xpack.alerting.healthCheck.interval="1s"',
          '--xpack.alerting.rules.minimumScheduleInterval.value="1s"',
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          `--xpack.actions.rejectUnauthorized=${rejectUnauthorized}`,
          `--xpack.actions.microsoftGraphApiUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}/api/_actions-FTS-external-service-simulators/exchange/users/test@/sendMail`,
          `--xpack.actions.ssl.verificationMode=${verificationMode}`,
          ...actionsProxyUrl,
          ...customHostSettings,
          '--xpack.eventLog.logEntries=true',
          '--xpack.task_manager.ephemeral_tasks.enabled=true',
          '--xpack.alerting.maxEphemeralActionsPerAlert=0',
          `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify([
            'actions:test.excluded',
          ])}`,
          `--xpack.actions.preconfiguredAlertHistoryEsIndex=${preconfiguredAlertHistoryEsIndex}`,
          `--xpack.actions.preconfigured=${JSON.stringify({
            'my-slack1': {
              actionTypeId: '.slack',
              name: 'Slack#xyz',
              secrets: {
                webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
              },
            },
            'custom-system-abc-connector': {
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
            'preconfigured-es-index-action': {
              actionTypeId: '.index',
              name: 'preconfigured_es_index_action',
              config: {
                index: 'functional-test-actions-index-preconfigured',
                refresh: true,
                executionTimeField: 'timestamp',
              },
            },
            'preconfigured.test.index-record': {
              actionTypeId: 'test.index-record',
              name: 'Test:_Preconfigured_Index_Record',
              config: {
                unencrypted: 'ignored-but-required',
              },
              secrets: {
                encrypted: 'this-is-also-ignored-and-also-required',
              },
            },
            'custom.ssl.noCustom': {
              actionTypeId: '.webhook',
              name: `${tlsWebhookServers.noCustom}`,
              config: {
                url: tlsWebhookServers.noCustom,
              },
            },
            'custom.ssl.rejectUnauthorizedFalse': {
              actionTypeId: '.webhook',
              name: `${tlsWebhookServers.rejectUnauthorizedFalse}`,
              config: {
                url: tlsWebhookServers.rejectUnauthorizedFalse,
              },
            },
            'custom.ssl.rejectUnauthorizedTrue': {
              actionTypeId: '.webhook',
              name: `${tlsWebhookServers.rejectUnauthorizedTrue}`,
              config: {
                url: tlsWebhookServers.rejectUnauthorizedTrue,
              },
            },
            'custom.ssl.caFile': {
              actionTypeId: '.webhook',
              name: `${tlsWebhookServers.caFile}`,
              config: {
                url: tlsWebhookServers.caFile,
              },
            },
          })}`,
          ...disabledPlugins
            .filter((k) => k !== 'security')
            .map((key) => `--xpack.${key}.enabled=false`),
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
        ],
      },
    };
  };
}
