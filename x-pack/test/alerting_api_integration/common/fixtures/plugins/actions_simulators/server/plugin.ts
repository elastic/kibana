/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import https from 'https';
import { Plugin, CoreSetup } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server/plugin';
import { ActionType } from '@kbn/actions-plugin/server';
import { initPlugin as initPagerduty } from './pagerduty_simulation';
import { initPlugin as initSwimlane } from './swimlane_simulation';
import { initPlugin as initServiceNow } from './servicenow_simulation';
import { initPlugin as initServiceNowOAuth } from './servicenow_oauth_simulation';
import { initPlugin as initJira } from './jira_simulation';
import { initPlugin as initResilient } from './resilient_simulation';
import { initPlugin as initSlack } from './slack_simulation';
import { initPlugin as initWebhook } from './webhook_simulation';
import { initPlugin as initMSExchange } from './ms_exchage_server_simulation';
import { initPlugin as initXmatters } from './xmatters_simulation';
import { initPlugin as initTorq } from './torq_simulation';
import { initPlugin as initUnsecuredAction } from './unsecured_actions_simulation';
import { initPlugin as initTines } from './tines_simulation';

export const NAME = 'actions-FTS-external-service-simulators';

export enum ExternalServiceSimulator {
  OPSGENIE = 'opsgenie',
  PAGERDUTY = 'pagerduty',
  SWIMLANE = 'swimlane',
  SERVICENOW = 'servicenow',
  SLACK = 'slack',
  JIRA = 'jira',
  RESILIENT = 'resilient',
  WEBHOOK = 'webhook',
  MS_EXCHANGE = 'exchange',
  XMATTERS = 'xmatters',
  TORQ = 'torq',
  TINES = 'tines',
}

export function getExternalServiceSimulatorPath(service: ExternalServiceSimulator): string {
  return `/api/_${NAME}/${service}`;
}

// list all urls for server.xsrf.allowlist config
export function getAllExternalServiceSimulatorPaths(): string[] {
  const allPaths = Object.values(ExternalServiceSimulator).map((service) =>
    getExternalServiceSimulatorPath(service)
  );
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.JIRA}/rest/api/2/issue`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.JIRA}/rest/api/2/createmeta`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.RESILIENT}/rest/orgs/201/incidents`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.MS_EXCHANGE}/users/test@/sendMail`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.MS_EXCHANGE}/1234567/oauth2/v2.0/token`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.SERVICENOW}/oauth_token.do`);
  allPaths.push(`/api/_${NAME}/${ExternalServiceSimulator.TINES}/webhook/path/secret`);
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

export async function getSwimlaneServer(): Promise<http.Server> {
  return await initSwimlane();
}

export async function getServiceNowServer(): Promise<http.Server> {
  return await initServiceNow();
}

interface FixtureSetupDeps {
  actions: ActionsPluginSetupContract;
  features: FeaturesPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginStartContract;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { features, actions }: FixtureSetupDeps) {
    // this action is specifically NOT enabled in ../../config.ts
    const notEnabledActionType: ActionType = {
      id: 'test.not-enabled',
      name: 'Test: Not Enabled',
      minimumLicenseRequired: 'gold',
      supportedFeatureIds: ['alerting'],
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

    const router = core.http.createRouter();

    initTorq(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.TORQ));
    initXmatters(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.XMATTERS));
    initPagerduty(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY));
    initJira(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA));
    initResilient(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.RESILIENT));
    initMSExchange(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.MS_EXCHANGE));
    initServiceNowOAuth(
      router,
      getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
    );
    initTines(router, getExternalServiceSimulatorPath(ExternalServiceSimulator.TINES));
    initUnsecuredAction(router, core);
  }

  public start() {}

  public stop() {}
}
