/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { isolateHostStepDefinition } from './isolate_host_step';

type PollContext = Parameters<typeof isolateHostStepDefinition.poll>[0];

const state = {
  action_id: 'action-1',
  deadline: new Date(Date.now() + 60_000).toISOString(),
  started_at: '2026-10-15T10:00:00.000Z',
  endpoint_ids: ['a1'],
};

const apiError = (status: number) =>
  new KibanaApiCallError({
    status,
    headers: {},
    body: { message: 'Endpoint authorization failure' },
    message: `HTTP ${status}`,
  });

const buildContext = (callKibanaApi: jest.Mock) =>
  ({
    state,
    contextManager: { callKibanaApi },
    logger: { warn: jest.fn() },
  } as unknown as PollContext);

describe('isolate host step', () => {
  describe('poll', () => {
    it('should fail with STATUS_UNREADABLE_FORBIDDEN when the details read returns 403', async () => {
      const callKibanaApi = jest.fn().mockRejectedValue(apiError(403));

      const result = await isolateHostStepDefinition.poll(buildContext(callKibanaApi));

      expect(result).toEqual({
        output: {
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_ids: ['action-1'],
          results: [{ endpoint_id: 'a1', agent_type: 'endpoint', status: 'pending' }],
          dropped_endpoint_ids: [],
          started_at: '2026-10-15T10:00:00.000Z',
        },
      });
    });

    it('should keep polling when the details read returns 5xx before the deadline', async () => {
      const callKibanaApi = jest.fn().mockRejectedValue(apiError(503));

      const result = await isolateHostStepDefinition.poll(buildContext(callKibanaApi));

      expect(result).toEqual({ state });
    });
  });
});
