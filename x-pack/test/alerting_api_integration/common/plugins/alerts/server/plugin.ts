/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, Logger, PluginInitializerContext } from '@kbn/core/server';
import { firstValueFrom, Subject } from 'rxjs';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import {
  PluginStartContract as AlertingPluginsStart,
  PluginSetupContract as AlertingPluginSetup,
} from '@kbn/alerting-plugin/server/plugin';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { defineRoutes } from './routes';
import { defineActionTypes } from './action_types';
import { defineAlertTypes } from './alert_types';

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
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly logger: Logger;

  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

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
      ],
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: ['alert'],
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
              ],
            },
          },
          ui: [],
        },
        read: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [],
            read: ['alert'],
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
              ],
            },
          },
          ui: [],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineAlertTypes(core, { alerting, ruleRegistry }, this.logger);
    defineRoutes(core, this.taskManagerStart, { logger: this.logger });
  }

  public start(core: CoreStart, { taskManager }: FixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
