/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { PluginSetupContract as AlertingPluginSetup } from '../../../../../../plugins/alerting/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '../../../../../../plugins/encrypted_saved_objects/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../plugins/features/server';
import { SpacesPluginStart } from '../../../../../../plugins/spaces/server';
import { SecurityPluginStart } from '../../../../../../plugins/security/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  alerting: AlertingPluginSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  constructor() {}

  public setup(core: CoreSetup<FixtureStartDeps>, { features, alerting }: FixtureSetupDeps) {
    features.registerKibanaFeature({
      id: 'alertsFixture',
      name: 'Alerts',
      app: ['alerts', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      alerting: ['test.executionContext'],
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: ['alert'],
            read: [],
          },
          alerting: {
            rule: {
              all: ['test.executionContext'],
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
              read: ['test.executionContext'],
            },
          },
          ui: [],
        },
      },
    });

    alerting.registerType({
      id: 'test.executionContext',
      name: 'Test: Query Elasticsearch server',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      producer: 'alertsFixture',
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        const [coreStart] = await core.getStartServices();
        await coreStart.elasticsearch.client.asInternalUser.ping();
      },
    });
  }

  public start() {}
  public stop() {}
}
