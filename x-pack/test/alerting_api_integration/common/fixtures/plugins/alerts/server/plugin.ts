/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { PluginSetupContract as ActionsPluginSetup } from '../../../../../../../plugins/actions/server/plugin';
import { PluginSetupContract as AlertingPluginSetup } from '../../../../../../../plugins/alerts/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { defineAlertTypes } from './alert_types';
import { defineActionTypes } from './action_types';
import { defineRoutes } from './routes';
import { SpacesPluginStart } from '../../../../../../../plugins/spaces/server';
import { SecurityPluginStart } from '../../../../../../../plugins/security/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerts: AlertingPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { features, actions, alerts }: FixtureSetupDeps) {
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
        'test.validation',
        'test.onlyContextVariables',
        'test.onlyStateVariables',
        'test.noop',
        'test.unrestricted-noop',
        'test.patternFiring',
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
            all: [
              'test.always-firing',
              'test.cumulative-firing',
              'test.never-firing',
              'test.failing',
              'test.authorization',
              'test.validation',
              'test.onlyContextVariables',
              'test.onlyStateVariables',
              'test.noop',
              'test.unrestricted-noop',
              'test.patternFiring',
              'test.throw',
              'test.longRunning',
            ],
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
            read: [
              'test.always-firing',
              'test.cumulative-firing',
              'test.never-firing',
              'test.failing',
              'test.authorization',
              'test.validation',
              'test.onlyContextVariables',
              'test.onlyStateVariables',
              'test.noop',
              'test.unrestricted-noop',
              'test.patternFiring',
              'test.throw',
              'test.longRunning',
            ],
          },
          ui: [],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineAlertTypes(core, { alerts });
    defineRoutes(core);
  }

  public start() {}
  public stop() {}
}
