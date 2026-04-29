/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getCustomScriptsIdsRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/queries/scripts/v1'),
    method: 'GET',
    handler: getCustomScriptsIdsHandler,
  };
};

const getCustomScriptsIdsHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 0.030241162,
      pagination: {
        offset: 0,
        limit: 100,
        total: 11,
      },
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: ['test-id-1', 'test-id-2'],
  };
};
