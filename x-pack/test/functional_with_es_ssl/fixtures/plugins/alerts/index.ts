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
      const noopAlertType: AlertType = {
        id: 'test.noop',
        name: 'Test: Noop',
        actionGroups: ['default'],
        async executor() {},
      };
      server.plugins.alerting.setup.registerType(noopAlertType);
    },
  });
}
