/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import {
  PluginSetupContract as AlertingSetup,
  AlertType,
} from '../../../../../../plugins/alerts/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../plugins/features/server';

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerts: AlertingSetup;
  features: FeaturesPluginSetup;
}

export class AlertingFixturePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerts, features }: AlertingExampleDeps) {
    createNoopAlertType(alerts);
    createAlwaysFiringAlertType(alerts);
    createFailingAlertType(alerts);
    features.registerKibanaFeature({
      id: 'alerting_fixture',
      name: 'alerting_fixture',
      app: [],
      category: { id: 'foo', label: 'foo' },
      alerting: ['test.always-firing', 'test.noop', 'test.failing'],
      privileges: {
        all: {
          alerting: {
            all: ['test.always-firing', 'test.noop', 'test.failing'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          alerting: {
            all: ['test.always-firing', 'test.noop', 'test.failing'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });
  }

  public start() {}
  public stop() {}
}

function createNoopAlertType(alerts: AlertingSetup) {
  const noopAlertType: AlertType = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    async executor() {},
    producer: 'alerts',
  };
  alerts.registerType(noopAlertType);
}

function createAlwaysFiringAlertType(alerts: AlertingSetup) {
  // Alert types
  const alwaysFiringAlertType: any = {
    id: 'test.always-firing',
    name: 'Always Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
    defaultActionGroupId: 'default',
    producer: 'alerts',
    async executor(alertExecutorOptions: any) {
      const { services, state, params } = alertExecutorOptions;

      (params.instances || []).forEach((instance: { id: string; state: any }) => {
        services
          .alertInstanceFactory(instance.id)
          .replaceState({ instanceStateValue: true, ...(instance.state || {}) })
          .scheduleActions('default');
      });

      return {
        globalStateValue: true,
        groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
      };
    },
  };
  alerts.registerType(alwaysFiringAlertType);
}

function createFailingAlertType(alerts: AlertingSetup) {
  const failingAlertType: any = {
    id: 'test.failing',
    name: 'Test: Failing',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    producer: 'alerts',
    defaultActionGroupId: 'default',
    async executor() {
      throw new Error('Failed to execute alert type');
    },
  };
  alerts.registerType(failingAlertType);
}
