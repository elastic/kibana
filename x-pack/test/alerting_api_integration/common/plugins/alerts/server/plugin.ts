/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginsStart,
} from '@kbn/alerting-plugin/server/plugin';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { IEventLogClientService } from '@kbn/event-log-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import { Subject, firstValueFrom } from 'rxjs';
import { defineActionTypes } from './action_types';
import { defineConnectorAdapters } from './connector_adapters';
import { defineRoutes } from './routes';
import { defineRuleTypes } from './rule_types';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingPluginSetup;
  taskManager: TaskManagerSetupContract;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface FixtureStartDeps {
  alerting: AlertingPluginsStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  eventLog: IEventLogClientService;
  notifications: NotificationsPluginStart;
}

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
    { features, actions, alerting, ruleRegistry }: FixtureSetupDeps
  ) {
    features.registerKibanaFeature({
      id: 'alertsFixture',
      name: 'Alerts',
      app: ['alerts', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      alerting: [
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
      ],
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [RULE_SAVED_OBJECT_TYPE],
            read: [],
          },
          alerting: {
            rule: {
              all: [
                'test.always-firing',
                'test.cumulative-firing',
                'test.never-firing',
                'test.failing',
                'test.delayed',
                'test.authorization',
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
              ],
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
              read: [
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
              ],
            },
          },
          ui: [],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineRuleTypes(core, { alerting, ruleRegistry }, this.logger);
    defineConnectorAdapters(core, { alerting });
    defineRoutes(core, this.taskManagerStart, this.notificationsStart, { logger: this.logger });
  }

  public start(core: CoreStart, { taskManager, notifications }: FixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();

    this.notificationsStart$.next(notifications);
    this.notificationsStart$.complete();
  }
  public stop() {}
}
