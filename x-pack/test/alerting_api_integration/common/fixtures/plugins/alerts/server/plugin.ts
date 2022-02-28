/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, Logger, PluginInitializerContext } from 'kibana/server';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { PluginSetupContract as ActionsPluginSetup } from '../../../../../../../plugins/actions/server/plugin';
import { PluginSetupContract as AlertingPluginSetup } from '../../../../../../../plugins/alerting/server/plugin';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../../../plugins/task_manager/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { defineAlertTypes } from './alert_types';
import { defineActionTypes } from './action_types';
import { defineRoutes } from './routes';
import { SpacesPluginStart } from '../../../../../../../plugins/spaces/server';
import { SecurityPluginStart } from '../../../../../../../plugins/security/server';
import { PluginStartContract as ActionsPluginStart } from '../../../../../../../plugins/actions/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  private readonly logger: Logger;

  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = this.taskManagerStart$
    .pipe(first())
    .toPromise();

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('fixtures', 'plugins', 'alerts');
  }

  public setup(
    core: CoreSetup<FixtureStartDeps>,
    { features, actions, alerting }: FixtureSetupDeps
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
              ],
            },
          },
          ui: [],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineAlertTypes(core, { alerting });
    defineRoutes(core, this.taskManagerStart, { logger: this.logger });
  }

  public start(core: CoreStart, { taskManager }: FixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
