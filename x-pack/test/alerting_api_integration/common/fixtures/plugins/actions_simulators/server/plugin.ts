/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import https from 'https';
import { Plugin, CoreSetup, IRouter } from 'kibana/server';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '../../../../../../../plugins/actions/server/plugin';
import { ActionType } from '../../../../../../../plugins/actions/server';
import { initPlugin as initPagerduty } from './pagerduty_simulation';
import { initPlugin as initServiceNow } from './servicenow_simulation';
import { initPlugin as initJira } from './jira_simulation';
import { initPlugin as initResilient } from './resilient_simulation';
import { initPlugin as initSlack } from './slack_simulation';
import { initPlugin as initWebhook } from './webhook_simulation';

export const NAME = 'actions-FTS-external-service-simulators';

export enum ExternalServiceSimulator {
  PAGERDUTY = 'pagerduty',
  SERVICENOW = 'servicenow',
  SLACK = 'slack',
  JIRA = 'jira',
  RESILIENT = 'resilient',
  WEBHOOK = 'webhook',
}

export function getExternalServiceSimulatorPath(service: ExternalServiceSimulator): string {
  return `/api/_${NAME}/${service}`;
}

export function getAllExternalServiceSimulatorPaths(): string[] {
  const allPaths = Object.values(ExternalServiceSimulator).map((service) =>
    getExternalServiceSimulatorPath(service)
  );
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.SERVICENOW}/api/now/v2/table/incident`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.SERVICENOW}/api/now/v2/table/sys_choice`);
  allPaths.push(
    `/api/_${NAME}/${ExternalServiceSimulator.SERVICENOW}/api/now/v2/table/sys_dictionary`
  );
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.JIRA}/rest/api/2/issue`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.JIRA}/rest/api/2/createmeta`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.RESILIENT}/rest/orgs/201/incidents`);
  return allPaths;
}

export async function getWebhookServer(): Promise<http.Server> {
  const { httpServer } = await initWebhook();
  return httpServer;
}

export async function getHttpsWebhookServer(): Promise<https.Server> {
  const { httpsServer } = await initWebhook();
  return httpsServer;
}

export async function getSlackServer(): Promise<http.Server> {
  return await initSlack();
}

interface FixtureSetupDeps {
  actions: ActionsPluginSetupContract;
  features: FeaturesPluginSetup;
}

interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { features, actions }: FixtureSetupDeps) {
    // this action is specifically NOT enabled in ../../config.ts
    const notEnabledActionType: ActionType = {
      id: 'test.not-enabled',
      name: 'Test: Not Enabled',
      minimumLicenseRequired: 'gold',
      async executor() {
        return { status: 'ok', actionId: '' };
      },
    };
    actions.registerType(notEnabledActionType);
    features.registerKibanaFeature({
      id: 'actionsSimulators',
      name: 'actionsSimulators',
      app: ['actions', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          app: ['actions', 'kibana'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          api: [],
        },
        read: {
          app: ['actions', 'kibana'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          api: [],
        },
      },
    });

    const router: IRouter = core.http.createRouter();

    initPagerduty(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY));
    initServiceNow(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW));
    initJira(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA));
    initResilient(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.RESILIENT));
  }

  public start() {}
  public stop() {}
}
