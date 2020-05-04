/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import { PluginSetupContract as ActionsPluginSetupContract } from '../../../../../../plugins/actions/server/plugin';
import { ActionType } from '../../../../../../plugins/actions/server';

import { initPlugin as initPagerduty } from './pagerduty_simulation';
import { initPlugin as initSlack } from './slack_simulation';
import { initPlugin as initWebhook } from './webhook_simulation';
import { initPlugin as initServiceNow } from './servicenow_simulation';
import { initPlugin as initJira } from './jira_simulation';

const NAME = 'actions-FTS-external-service-simulators';

export enum ExternalServiceSimulator {
  PAGERDUTY = 'pagerduty',
  SERVICENOW = 'servicenow',
  JIRA = 'jira',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

export function getExternalServiceSimulatorPath(service: ExternalServiceSimulator): string {
  return `/api/_${NAME}/${service}`;
}

export function getAllExternalServiceSimulatorPaths(): string[] {
  const allPaths = Object.values(ExternalServiceSimulator).map(service =>
    getExternalServiceSimulatorPath(service)
  );

  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.SERVICENOW}/api/now/v2/table/incident`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.JIRA}/rest/api/2/issue`);
  return allPaths;
}

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['xpack_main'],
    name: NAME,
    init: (server: Hapi.Server) => {
      // this action is specifically NOT enabled in ../../config.ts
      const notEnabledActionType: ActionType = {
        id: 'test.not-enabled',
        name: 'Test: Not Enabled',
        minimumLicenseRequired: 'gold',
        async executor() {
          return { status: 'ok', actionId: '' };
        },
      };
      (server.newPlatform.setup.plugins.actions as ActionsPluginSetupContract).registerType(
        notEnabledActionType
      );
      server.plugins.xpack_main.registerFeature({
        id: 'actions',
        name: 'Actions',
        app: ['actions', 'kibana'],
        privileges: {
          all: {
            app: ['actions', 'kibana'],
            savedObject: {
              all: ['action', 'action_task_params'],
              read: [],
            },
            ui: [],
            api: ['actions-read', 'actions-all'],
          },
          read: {
            app: ['actions', 'kibana'],
            savedObject: {
              all: ['action_task_params'],
              read: ['action'],
            },
            ui: [],
            api: ['actions-read'],
          },
        },
      });

      initPagerduty(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY));
      initSlack(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.SLACK));
      initWebhook(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK));
      initServiceNow(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW));
      initJira(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA));
    },
  });
}
