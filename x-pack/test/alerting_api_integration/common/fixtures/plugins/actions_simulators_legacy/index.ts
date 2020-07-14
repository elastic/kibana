/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import {
  getExternalServiceSimulatorPath,
  NAME,
  ExternalServiceSimulator,
} from '../actions_simulators/server/plugin';

import { initPlugin as initWebhook } from './webhook_simulation';
import { initPlugin as initSlack } from './slack_simulation';

// eslint-disable-next-line import/no-default-export
export default function (kibana: any) {
  return new kibana.Plugin({
    require: ['xpack_main'],
    name: `${NAME}-legacy`,
    init: (server: Hapi.Server) => {
      initWebhook(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK));
      initSlack(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.SLACK));
    },
  });
}
