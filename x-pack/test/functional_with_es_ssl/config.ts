/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve, join } from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';
import { pageObjects } from './page_objects';

// .server-log is specifically not enabled
const enabledActionTypes = [
  '.email',
  '.index',
  '.pagerduty',
  '.servicenow',
  '.slack',
  '.webhook',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  const servers = {
    ...xpackFunctionalConfig.get('servers'),
    elasticsearch: {
      ...xpackFunctionalConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
  };

  const returnedObject = {
    ...xpackFunctionalConfig.getAll(),
    servers,
    services,
    pageObjects,
    // list paths to the files that contain your plugins tests
    testFiles: [
      resolve(__dirname, './apps/triggers_actions_ui'),
      resolve(__dirname, './apps/uptime'),
    ],
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      triggersActions: {
        pathname: '/app/management/insightsAndAlerting/triggersActions',
      },
    },
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      ssl: true,
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--elasticsearch.hosts=https://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--plugin-path=${join(__dirname, 'fixtures', 'plugins', 'alerts')}`,
        `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
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
        })}`,
      ],
    },
  };

  return returnedObject;
}
