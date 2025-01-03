/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCrowdstrikeRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';
import { createCrowdstrikeGetAgentOnlineStatusDetailsMock } from '../mocks';

export const getAgentOnlineStatusRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/devices/entities/online-state/v1'),
    method: 'GET',
    handler: getAgentOnlineStatusHandler,
  };
};

const getAgentOnlineStatusHandler: ExternalEdrServerEmulatorRouteHandlerMethod<{}> = async () => {
  return {
    resources: [createCrowdstrikeGetAgentOnlineStatusDetailsMock({})],
    meta: {
      query_time: 123,
      powered_by: 'test',
      trace_id: 'test',
    },
    errors: [],
  };
};
