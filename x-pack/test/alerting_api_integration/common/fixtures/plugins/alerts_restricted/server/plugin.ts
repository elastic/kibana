/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { PluginSetupContract as AlertingPluginSetup } from '@kbn/alerting-plugin/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { defineAlertTypes } from './alert_types';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, { features, alerting }: FixtureSetupDeps) {
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
            rule: {
              all: ['test.restricted-noop', 'test.unrestricted-noop', 'test.noop'],
            },
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
            rule: {
              read: ['test.restricted-noop', 'test.unrestricted-noop', 'test.noop'],
            },
          },
          ui: [],
        },
      },
    });

    defineAlertTypes(core, { alerting });
  }

  public start() {}
  public stop() {}
}
