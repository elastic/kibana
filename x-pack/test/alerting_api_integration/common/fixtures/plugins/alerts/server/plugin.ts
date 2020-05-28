/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { PluginSetupContract as ActionsPluginSetup } from '../../../../../../../plugins/actions/server/plugin';
import { PluginSetupContract as AlertingPluginSetup } from '../../../../../../../plugins/alerting/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../../plugins/features/server';
import { defineAlertTypes } from './alert_types';
import { defineActionTypes } from './action_types';
import { defineRoutes } from './routes';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(
    core: CoreSetup<FixtureStartDeps>,
    { features, actions, alerting }: FixtureSetupDeps
  ) {
    features.registerFeature({
      id: 'alerting',
      name: 'Alerting',
      app: ['alerting', 'kibana'],
      privileges: {
        all: {
          app: ['alerting', 'kibana'],
          savedObject: {
            all: ['alert'],
            read: [],
          },
          ui: [],
          api: ['alerting-read', 'alerting-all'],
        },
        read: {
          app: ['alerting', 'kibana'],
          savedObject: {
            all: [],
            read: ['alert'],
          },
          ui: [],
          api: ['alerting-read'],
        },
      },
    });

    defineActionTypes(core, { actions });
    defineAlertTypes(core, { alerting });
    defineRoutes(core);
  }

  public start() {}
  public stop() {}
}
