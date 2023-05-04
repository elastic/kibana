/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { join } from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test';
import { getAllExternalServiceSimulatorPaths } from '@kbn/actions-simulators-plugin/server/plugin';
import { pageObjects } from './page_objects';

// .server-log is specifically not enabled
const enabledActionTypes = [
  '.opsgenie',
  '.email',
  '.index',
  '.pagerduty',
  '.swimlane',
  '.jira',
  '.resilient',
  '.servicenow',
  '.servicenow-sir',
  '.slack',
  '.slack_api',
  '.tines',
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
      certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)],
    },
  };

  const returnedObject = {
    ...xpackFunctionalConfig.getAll(),
    servers,
    pageObjects,
    // Don't list paths to the files that contain your plugins tests here
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      triggersActions: {
        pathname: '/app/management/insightsAndAlerting/triggersActions',
      },
      triggersActionsConnectors: {
        pathname: '/app/management/insightsAndAlerting/triggersActionsConnectors',
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
        `--plugin-path=${join(__dirname, 'plugins/alerts')}`,
        `--plugin-path=${join(__dirname, 'plugins/cases')}`,
        `--plugin-path=${join(
          __dirname,
          '../alerting_api_integration/common/plugins/actions_simulators'
        )}`,
        `--xpack.trigger_actions_ui.enableExperimental=${JSON.stringify([
          'internalAlertsTable',
          'ruleTagFilter',
          'ruleStatusFilter',
        ])}`,
        `--xpack.alerting.rules.minimumScheduleInterval.value="2s"`,
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
        `--server.xsrf.allowlist=${JSON.stringify(getAllExternalServiceSimulatorPaths())}`,
      ],
    },
    security: {
      roles: {
        alerts_and_actions_role: {
          kibana: [
            {
              feature: {
                actions: ['all'],
                stackAlerts: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },
        only_actions_role: {
          kibana: [
            {
              feature: {
                actions: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },
        discover_alert: {
          kibana: [
            {
              feature: {
                actions: ['all'],
                stackAlerts: ['all'],
                discover: ['all'],
                advancedSettings: ['all'],
                indexPatterns: ['all'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['search-source-alert', 'search-source-alert-output'],
                privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
        },
      },
      defaultRoles: ['superuser'],
    },
  };

  return returnedObject;
}
