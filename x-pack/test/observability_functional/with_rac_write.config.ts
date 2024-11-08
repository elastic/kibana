/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test';

// .server-log is specifically not enabled
const enabledActionTypes = [
  '.email',
  '.index',
  '.pagerduty',
  '.swimlane',
  '.servicenow',
  '.slack',
  '.webhook',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const servers = {
    ...xpackFunctionalConfig.get('servers'),
    elasticsearch: {
      ...xpackFunctionalConfig.get('servers.elasticsearch'),
      protocol: 'https',
      certificateAuthorities: [readFileSync(CA_CERT_PATH)],
    },
  };

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),
    servers,
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      ssl: true,
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
        '--xpack.cloud.base_url=https://cloud.elastic.co',
        '--xpack.spaces.allowSolutionVisibility=true',
        `--elasticsearch.hosts=https://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--plugin-path=${resolve(__dirname, '../functional_with_es_ssl/plugins/alerts')}`,
        `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
        `--xpack.actions.preconfiguredAlertHistoryEsIndex=false`,
        `--xpack.actions.preconfigured=${JSON.stringify({
          'my-slack1': {
            actionTypeId: '.slack',
            name: 'Slack#xyztest',
            secrets: {
              webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
            },
          },
          'my-server-log': {
            actionTypeId: '.server-log',
            name: 'Serverlog#xyz',
          },
          'my-email-connector': {
            actionTypeId: '.email',
            name: 'Email#test-preconfigured-email',
            config: {
              from: 'me@example.com',
              host: 'localhost',
              port: '1025',
            },
          },
        })}`,
      ],
    },
    uiSettings: {
      defaults: {
        'dateFormat:tz': 'UTC',
        'observability:enableLegacyUptimeApp': true,
      },
    },
    testFiles: [resolve(__dirname, './apps/observability')],
    junit: {
      ...xpackFunctionalConfig.get('junit'),
      reportName: 'Chrome X-Pack Observability UI Functional Tests',
    },
  };
}
