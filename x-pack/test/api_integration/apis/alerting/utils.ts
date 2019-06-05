/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_ARCHIVER_ACTION_ID } from './constants';

export function getTestAlertData() {
  return {
    alertTypeId: 'cpu-check',
    interval: 10 * 1000,
    actions: [
      {
        group: 'default',
        id: ES_ARCHIVER_ACTION_ID,
        params: {
          message:
            'The server {{context.server}} has a high CPU usage of {{state.lastCpuUsage}}% which is above the {{context.threshold}}% threshold',
        },
      },
    ],
    alertTypeParams: {
      server: '1.2.3.4',
      threshold: 80,
    },
  };
}
