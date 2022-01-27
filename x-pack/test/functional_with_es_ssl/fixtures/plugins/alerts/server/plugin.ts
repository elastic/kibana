/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import {
  PluginSetupContract as AlertingSetup,
  RuleType,
} from '../../../../../../plugins/alerting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../../../../plugins/features/server';

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
}

export const noopAlertType: RuleType<{}, {}, {}, {}, {}, 'default'> = {
  id: 'test.noop',
  name: 'Test: Noop',
  actionGroups: [{ id: 'default', name: 'Default' }],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  async executor() {},
  producer: 'alerts',
};

export const alwaysFiringAlertType: RuleType<
  { instances: Array<{ id: string; state: any }> },
  never, // Only use if defining useSavedObjectReferences hook
  {
    globalStateValue: boolean;
    groupInSeriesIndex: number;
  },
  { instanceStateValue: boolean; globalStateValue: boolean; groupInSeriesIndex: number },
  never,
  'default' | 'other'
> = {
  id: 'test.always-firing',
  name: 'Always Firing',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'other', name: 'Other' },
  ],
  defaultActionGroupId: 'default',
  producer: 'alerts',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  async executor(alertExecutorOptions) {
    const { services, state, params } = alertExecutorOptions;

    (params.instances || []).forEach((instance: { id: string; state: any }) => {
      services.alertFactory
        .create(instance.id)
        .replaceState({ instanceStateValue: true, ...(instance.state || {}) })
        .scheduleActions('default');
    });

    return {
      globalStateValue: true,
      groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
    };
  },
};

export const failingAlertType: RuleType<never, never, never, never, never, 'default' | 'other'> = {
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
  minimumLicenseRequired: 'basic',
  isExportable: true,
  async executor() {
    throw new Error('Failed to execute alert type');
  },
};

export class AlertingFixturePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerting, features }: AlertingExampleDeps) {
    alerting.registerType(noopAlertType);
    alerting.registerType(alwaysFiringAlertType);
    alerting.registerType(failingAlertType);
    features.registerKibanaFeature({
      id: 'alerting_fixture',
      name: 'alerting_fixture',
      app: [],
      category: { id: 'foo', label: 'foo' },
      alerting: ['test.always-firing', 'test.noop', 'test.failing'],
      privileges: {
        all: {
          alerting: {
            rule: {
              all: ['test.always-firing', 'test.noop', 'test.failing'],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          alerting: {
            rule: {
              all: ['test.always-firing', 'test.noop', 'test.failing'],
            },
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
