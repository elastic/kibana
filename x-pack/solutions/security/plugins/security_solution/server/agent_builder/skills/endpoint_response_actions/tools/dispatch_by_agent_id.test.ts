/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
  type ToolHandlerReturn,
  type ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../endpoint/errors';
import { createMockEndpointAppContext } from '../../../../endpoint/mocks';
import { getActionDetailsById } from '../../../../endpoint/services/actions';
import { getRunningProcessesTool } from './get_running_processes';
import { isolateHostTool } from './isolate_host';
import { scanHostTool } from './scan_host';
import { unisolateHostTool } from './unisolate_host';

jest.mock('../../../../endpoint/services/actions', () => {
  const original = jest.requireActual('../../../../endpoint/services/actions');
  return { ...original, getActionDetailsById: jest.fn() };
});

const mockGetActionDetailsById = getActionDetailsById as jest.Mock;

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = {
  logger: mockLogger,
  request: httpServerMock.createKibanaRequest(),
  runContext: {
    runId: 'run-test-1',
    stack: [{ type: 'agent', agentId: 'test-agent', conversationId: 'conv-test-1' }],
  },
} as unknown as ToolHandlerContext;

const results = (result: unknown) => {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
};

interface Case {
  label: string;
  clientMethod: 'isolate' | 'release' | 'scan' | 'runningProcesses';
  action: string;
  build: typeof isolateHostTool;
  extraParams: Record<string, unknown>;
}

const CASES: Case[] = [
  {
    label: 'isolate_host',
    clientMethod: 'isolate',
    action: 'isolate',
    build: isolateHostTool,
    extraParams: {},
  },
  {
    label: 'unisolate_host',
    clientMethod: 'release',
    action: 'unisolate',
    build: unisolateHostTool,
    extraParams: {},
  },
  {
    label: 'scan_host',
    clientMethod: 'scan',
    action: 'scan',
    build: scanHostTool as unknown as typeof isolateHostTool,
    extraParams: { path: '/tmp/x' },
  },
  {
    label: 'running_processes',
    clientMethod: 'runningProcesses',
    action: 'running-processes',
    build: getRunningProcessesTool,
    extraParams: {},
  },
];

describe.each(CASES)(
  '$label: dispatch by agent ID',
  ({ clientMethod, action, build, extraParams }) => {
    jest.setTimeout(20000);

    let service: EndpointAppContextService;
    let client: Record<string, jest.Mock>;
    let ensureInCurrentSpace: jest.Mock;
    let getAgent: jest.Mock;
    let listAgents: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      service = createMockEndpointAppContext().service;
      jest.spyOn(service, 'getEndpointMetadataService').mockImplementation((() => ({
        getHostMetadataList: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })) as unknown as EndpointAppContextService['getEndpointMetadataService']);

      client = {
        [clientMethod]: jest.fn().mockResolvedValue({ id: 'action-1', status: 'pending' }),
      };
      service.getInternalResponseActionsClient = jest.fn(
        () => client
      ) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      mockGetActionDetailsById.mockResolvedValue({
        id: 'action-1',
        status: 'successful',
        wasSuccessful: true,
        isCompleted: true,
      });

      ensureInCurrentSpace = jest.fn().mockResolvedValue(undefined);
      getAgent = jest.fn().mockResolvedValue({
        id: 'agent-b',
        status: 'online',
        packages: ['endpoint'],
        local_metadata: { host: { name: 'dup-host' } },
      });
      listAgents = jest.fn().mockResolvedValue({
        agents: [
          { id: 'agent-a', status: 'online', packages: ['endpoint'] },
          { id: 'agent-b', status: 'online', packages: ['endpoint'] },
        ],
      });
      service.getInternalFleetServices = jest.fn(() => ({
        agent: { listAgents, getAgent },
        ensureInCurrentSpace,
      })) as unknown as EndpointAppContextService['getInternalFleetServices'];
    });

    it('accepts agentId alone and rejects a call with neither target', () => {
      const { schema } = build(service);

      expect(schema.safeParse({ agentId: 'agent-b', ...extraParams }).success).toBe(true);
      expect(schema.safeParse({ hostName: 'dup-host', ...extraParams }).success).toBe(true);
      expect(schema.safeParse({ ...extraParams }).success).toBe(false);
    });

    it('completes the disambiguation the ambiguous_hostname result prescribes', async () => {
      const tool = build(service);

      // Step 1: the shared hostname is ambiguous and nothing is dispatched.
      const first = results(
        await tool.handler({ hostName: 'dup-host', ...extraParams }, mockContext)
      );
      const ambiguous = first[0].data as Record<string, unknown>;
      expect(ambiguous.reason).toBe('ambiguous_hostname');
      expect(client[clientMethod]).not.toHaveBeenCalled();
      expect(ambiguous.message).toContain('agentId');
      const candidateIds = (ambiguous.candidates as Array<{ agentId: string }>).map(
        (c) => c.agentId
      );
      expect(candidateIds).toContain('agent-b');

      // Step 2: retrying with one of the listed candidate IDs dispatches to
      // exactly that agent, and does not walk the hostname again.
      listAgents.mockClear();
      const second = results(
        await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext)
      );
      const data = second[0].data as Record<string, unknown>;

      expect(data.found).not.toBe(false);
      expect(data.action).toBe(action);
      expect(data.actionId).toBe('action-1');
      expect(listAgents).not.toHaveBeenCalled();
      expect(client[clientMethod]).toHaveBeenCalledTimes(1);
      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-b'] })
      );
    });

    it('runs the same space check on a supplied agent ID and never dispatches outside the space', async () => {
      ensureInCurrentSpace.mockRejectedValue(new NotFoundError('not in space'));
      const tool = build(service);

      const out = results(
        await tool.handler({ agentId: 'other-space-agent', ...extraParams }, mockContext)
      );
      const data = out[0].data as Record<string, unknown>;

      expect(ensureInCurrentSpace).toHaveBeenCalledWith({ agentIds: ['other-space-agent'] });
      expect(data.found).toBe(false);
      expect(data.reason).toBe('endpoint_not_found');
      expect(data.agentId).toBe('other-space-agent');
      expect(getAgent).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('refuses an agent ID whose integration is not a response-action target', async () => {
      getAgent.mockResolvedValue({ id: 'agent-b', packages: ['system'] });
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      expect((out[0].data as Record<string, unknown>).reason).toBe('endpoint_not_found');
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('prefers agentId over a conflicting hostName instead of resolving the name', async () => {
      const tool = build(service);

      await tool.handler({ hostName: 'dup-host', agentId: 'agent-b', ...extraParams }, mockContext);

      expect(listAgents).not.toHaveBeenCalled();
      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-b'] })
      );
    });

    it('keeps the dispatched action ID when every completion read fails', async () => {
      jest.useFakeTimers();
      try {
        mockGetActionDetailsById.mockRejectedValue(new Error('es unavailable'));
        const tool = build(service);

        const pending = tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext);
        await jest.advanceTimersByTimeAsync(5 * 60_000);
        const out = results(await pending);

        // Not an `unknown_error`: the dispatch succeeded, only monitoring failed.
        expect(out[0].type).not.toBe('error');
        const data = out[0].data as Record<string, unknown>;
        expect(data.actionId).toBe('action-1');
        expect(data.status).toBe('pending');
      } finally {
        jest.useRealTimers();
      }
    });
  }
);
