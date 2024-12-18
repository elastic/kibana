/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath, TEST_AGENT_ID, TEST_BATCH_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const batchInitRTRSessionRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/combined/batch-init-session/v1'),
    method: 'POST',
    handler: batchInitSessionSuccessHandler,
  };
};
// @ts-expect-error - example of error response
const initSessionWrongHostIdError = async () => {
  return {
    meta: {
      query_time: 0.244284399,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    batch_id: '',
    resources: {
      [TEST_AGENT_ID]: {
        session_id: '',
        complete: false,
        stdout: '',
        stderr: '',
        aid: TEST_AGENT_ID,
        errors: [
          {
            code: 500,
            message: `uuid: incorrect UUID length 47 in string ${TEST_AGENT_ID}`,
          },
        ],
        query_time: 0,
        offline_queued: false,
      },
    },
    errors: [
      {
        code: 404,
        message: 'no successful hosts initialized on RTR',
      },
    ],
  };
};
// @ts-expect-error - example of error response
const initSessionMissingIdsError = async () => {
  return {
    meta: {
      query_time: 0.00034664,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    batch_id: '',
    resources: {},
    errors: [
      {
        code: 400,
        message:
          'Invalid number of hosts in request: 0. Must be an integer greater than 0 and less than or equal to 10000',
      },
    ],
  };
};

const batchInitSessionSuccessHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 1.067267552,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    batch_id: TEST_BATCH_ID,
    resources: {
      [TEST_AGENT_ID]: {
        session_id: TEST_SESSION_ID,
        task_id: 'xxx',
        complete: true,
        stdout: '/',
        stderr: '',
        base_command: 'pwd',
        aid: TEST_AGENT_ID,
        errors: [],
        query_time: 0,
        offline_queued: false,
      },
    },
    errors: [],
  };
};
