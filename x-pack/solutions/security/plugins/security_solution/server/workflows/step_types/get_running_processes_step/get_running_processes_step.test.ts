/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { getRunningProcessesStepDefinition } from './get_running_processes_step';

type PollContext = Parameters<typeof getRunningProcessesStepDefinition.poll>[0];

const state = {
  action_id: 'action-1',
  deadline: new Date(Date.now() + 60_000).toISOString(),
  started_at: '2026-10-15T10:00:00.000Z',
  endpoint_ids: ['a1'],
  max_processes: 2,
};

const buildContext = (callKibanaApi: jest.Mock) =>
  ({
    state,
    contextManager: { callKibanaApi },
    logger: { warn: jest.fn() },
  } as unknown as PollContext);

describe('get running processes step', () => {
  describe('poll', () => {
    it('should cap the process list and report the full count on success', async () => {
      const entries = [
        { pid: 1, user: 'root', command: '/sbin/init', entity_id: 'e1' },
        { pid: 2, user: 'root', command: '/usr/sbin/sshd' },
        { pid: 3, user: 'bob', command: '/bin/bash', entity_id: 'e3' },
      ];
      const callKibanaApi = jest.fn().mockResolvedValue({
        body: {
          data: {
            agents: ['a1'],
            agentType: 'endpoint',
            hosts: { a1: { name: 'host-1' } },
            agentState: {
              a1: {
                isCompleted: true,
                wasSuccessful: true,
                completedAt: '2026-10-15T10:00:05.000Z',
              },
            },
            outputs: { a1: { type: 'json', content: { code: 'success', entries } } },
          },
        },
      });

      const result = await getRunningProcessesStepDefinition.poll(buildContext(callKibanaApi));

      expect(result).toEqual({
        output: {
          status: 'success',
          action_ids: ['action-1'],
          results: [
            {
              endpoint_id: 'a1',
              agent_type: 'endpoint',
              status: 'success',
              host_name: 'host-1',
              completed_at: '2026-10-15T10:00:05.000Z',
              process_count: 3,
              processes: [
                { pid: '1', user: 'root', command: '/sbin/init', entity_id: 'e1' },
                { pid: '2', user: 'root', command: '/usr/sbin/sshd' },
              ],
            },
          ],
          dropped_endpoint_ids: [],
          started_at: '2026-10-15T10:00:00.000Z',
        },
      });
    });

    it('should fail with STATUS_UNREADABLE_FORBIDDEN when the details read returns 403', async () => {
      const callKibanaApi = jest.fn().mockRejectedValue(
        new KibanaApiCallError({
          status: 403,
          headers: {},
          body: { message: 'Endpoint authorization failure' },
          message: 'HTTP 403',
        })
      );

      const result = await getRunningProcessesStepDefinition.poll(buildContext(callKibanaApi));

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
  });
});
