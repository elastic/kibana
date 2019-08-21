/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import { initPlugin as initSlack } from './slack_simulation';

const NAME = 'actions-FTS-external-service-simulators';

export enum ExternalServiceSimulator {
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

export function getExternalServiceSimulatorPath(service: ExternalServiceSimulator): string {
  return `/api/_${NAME}/${service}`;
}

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['actions'],
    name: NAME,
    init: (server: Hapi.Server) => {
      initSlack(server, getExternalServiceSimulatorPath(ExternalServiceSimulator.SLACK));
    },
  });
}
