/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
  ElasticsearchClient,
} from '@kbn/core/server';
import { firstValueFrom, Subject } from 'rxjs';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server/plugin';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { defineRoutes } from './routes';
import { defineActionTypes } from './action_types';
import { defineRuleTypes } from './rule_types';
import { defineConnectorAdapters } from './connector_adapters';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingServerSetup;
  taskManager: TaskManagerSetupContract;
  ruleRegistry: RuleRegistryPluginSetupContract;
  eventLog: IEventLogService;
}

export interface FixtureStartDeps {
  alerting: AlertingServerStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  eventLog: IEventLogClientService;
  notifications: NotificationsPluginStart;
  elasticsearch: ElasticsearchClient;
}

const testRuleTypes = [
  'test.always-firing',
  'test.cumulative-firing',
  'test.never-firing',
  'test.failing',
  'test.authorization',
  'test.delayed',
  'test.validation',
  'test.onlyContextVariables',
  'test.onlyStateVariables',
  'test.noop',
  'test.unrestricted-noop',
  'test.patternFiring',
  'test.patternSuccessOrFailure',
  'test.throw',
  'test.longRunning',
  'test.exceedsAlertLimit',
  'test.always-firing-alert-as-data',
  'test.patternFiringAad',
  'test.waitingRule',
  'test.patternFiringAutoRecoverFalse',
  'test.severity',
];

const testAlertingFeatures = testRuleTypes.map((ruleTypeId) => ({
  ruleTypeId,
  consumers: ['alertsFixture', ALERTING_FEATURE_ID],
}));

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly logger: Logger;

  taskManagerStart$ = new Subject<TaskManagerStartContract>();
  taskManagerStart = firstValueFrom(this.taskManagerStart$);

  notificationsStart$ = new Subject<NotificationsPluginStart>();
  notificationsStart = firstValueFrom(this.notificationsStart$);

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('fixtures', 'plugins', 'alerts');
  }

  public setup(
    core: CoreSetup<FixtureStartDeps>,
    { features, actions, alerting, ruleRegistry, eventLog }: FixtureSetupDeps
  ) {
    features.registerKibanaFeature({
      id: 'alertsFixture',
      name: 'Alerts',
      app: ['alerts', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      alerting: testAlertingFeatures,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [RULE_SAVED_OBJECT_TYPE],
            read: [],
          },
          alerting: {
            rule: {
              all: testAlertingFeatures,
            },
          },
          ui: [],
        },
        read: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [],
            read: [RULE_SAVED_OBJECT_TYPE],
          },
          alerting: {
            rule: {
              read: testAlertingFeatures,
            },
          },
          ui: [],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineRuleTypes(core, { alerting, ruleRegistry }, this.logger);
    defineConnectorAdapters(core, { alerting });
    const eventLogger = eventLog.getLogger({
      event: { provider: 'alerting' },
    });
    defineRoutes(core, this.taskManagerStart, this.notificationsStart, {
      logger: this.logger,
      eventLogger,
    });
  }

  public start(core: CoreStart, { taskManager, notifications }: FixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();

    this.notificationsStart$.next(notifications);
    this.notificationsStart$.complete();
  }
  public stop() {}
}
