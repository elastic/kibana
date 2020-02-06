/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../../../../../legacy/plugins/alerting';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['alerting'],
    name: 'alerts',
    init(server: any) {
      createNoopAlertType(server.plugins.alerting.setup);
      createAlwaysFiringAlertType(server.plugins.alerting.setup);
    },
  });
}

function createNoopAlertType(setupContract: any) {
  const noopAlertType: AlertType = {
    id: 'test.noop',
    name: 'Test: Noop',
    actionGroups: ['default'],
    async executor() {},
  };
  setupContract.registerType(noopAlertType);
}

function createAlwaysFiringAlertType(setupContract: any) {
  // Alert types
  const alwaysFiringAlertType: any = {
    id: 'test.always-firing',
    name: 'Always Firing',
    actionGroups: ['default', 'other'],
    async executor(alertExecutorOptions: any) {
      const { services, state } = alertExecutorOptions;

      services
        .alertInstanceFactory('1')
        .replaceState({ instanceStateValue: true })
        .scheduleActions('default', {
          instanceContextValue: true,
        });
      return {
        globalStateValue: true,
        groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
      };
    },
  };
  setupContract.registerType(alwaysFiringAlertType);
}
