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

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerts: AlertingSetup;
}

export class AlertingFixturePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerts }: AlertingExampleDeps) {
    createNoopAlertType(alerts);
    createAlwaysFiringAlertType(alerts);
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
    producer: 'alerting',
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
    producer: 'alerting',
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
