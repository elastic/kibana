/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../../../../../plugins/alerting/server';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['alerting'],
    name: 'alerts',
    init(server: any) {
      createNoopAlertType(server.newPlatform.setup.plugins.alerting);
      createAlwaysFiringAlertType(server.newPlatform.setup.plugins.alerting);
    },
  });
}

function createNoopAlertType(setupContract: any) {
  const noopAlertType: AlertType = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: [{ id: 'default', name: 'Default' }],
    async executor() {},
  };
  setupContract.registerType(noopAlertType);
}

function createAlwaysFiringAlertType(setupContract: any) {
  // Alert types
  const alwaysFiringAlertType: any = {
    id: 'test.always-firing',
    name: 'Always Firing',
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'other', name: 'Other' },
    ],
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
  setupContract.registerType(alwaysFiringAlertType);
}
