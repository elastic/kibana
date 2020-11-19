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

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerts: AlertingPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { features, alerts }: FixtureSetupDeps) {
    features.registerKibanaFeature({
      id: 'alertsRestrictedFixture',
      name: 'AlertRestricted',
      app: ['alerts', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      alerting: ['test.restricted-noop', 'test.unrestricted-noop', 'test.noop'],
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: ['alert'],
            read: [],
          },
          alerting: {
            all: ['test.restricted-noop', 'test.unrestricted-noop', 'test.noop'],
          },
          ui: [],
        },
        read: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [],
            read: [],
          },
          alerting: {
            read: ['test.restricted-noop', 'test.unrestricted-noop', 'test.noop'],
          },
          ui: [],
        },
      },
    });

    defineAlertTypes(core, { alerts });
  }

  public start() {}
  public stop() {}
}
