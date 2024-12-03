/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server/plugin';
import { AlertingServerSetup } from '@kbn/alerting-plugin/server/plugin';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { defineAlertTypes } from './alert_types';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  actions: ActionsPluginSetup;
  alerting: AlertingServerSetup;
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
      alerting: [
        {
          ruleTypeId: 'test.restricted-noop',
          consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
        },
        {
          ruleTypeId: 'test.unrestricted-noop',
          consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
        },
        { ruleTypeId: 'test.noop', consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID] },
      ],
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
              all: [
                {
                  ruleTypeId: 'test.restricted-noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: 'test.unrestricted-noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: 'test.noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
              ],
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
              read: [
                {
                  ruleTypeId: 'test.restricted-noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: 'test.unrestricted-noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: 'test.noop',
                  consumers: ['alertsRestrictedFixture', ALERTING_FEATURE_ID],
                },
              ],
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
