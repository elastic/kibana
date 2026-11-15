/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isToolHandlerInterruptReturn,
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
  type ToolHandlerReturn,
  type ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { NotFoundError } from '../../../../endpoint/errors';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
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

// Tool-call state, as `run_tool.ts` scopes it: the confirmation the handler asks
// for records the approved target here and the handler reads it back once the
// analyst confirms.
const toolCallState: { value?: unknown } = { value: undefined };
const confirmationStatus: { value: 'unprompted' | 'accepted' | 'rejected' } = {
  value: 'unprompted',
};
const mockAskForConfirmation = jest.fn((opts: Record<string, unknown>) => ({ prompt: opts }));

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = {
  callContext: { callSource: 'agent', toolCallId: 'call-test-1' },
  logger: mockLogger,
  request: httpServerMock.createKibanaRequest(),
  stateManager: {
    getState: () => toolCallState.value,
    setState: (state: unknown) => {
      toolCallState.value = state;
    },
  },
  prompts: {
    checkConfirmationStatus: () => ({ status: confirmationStatus.value }),
    askForConfirmation: mockAskForConfirmation,
  },
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

// The handler asks for the analyst's confirmation and the runner re-runs it once
// they answer; dispatching steps replay both phases so the handler sees the
// target the analyst was shown.
async function confirmThenDispatch(
  tool: ReturnType<Case['build']>,
  toolParams: Record<string, unknown>
) {
  confirmationStatus.value = 'unprompted';
  const prompted = await tool.handler(toolParams, mockContext);
  if (!isToolHandlerInterruptReturn(prompted)) {
    return prompted;
  }

  confirmationStatus.value = 'accepted';

  return tool.handler(toolParams, mockContext);
}

// The card the handler asks the analyst to confirm for these params.
async function cardFor(tool: ReturnType<Case['build']>, toolParams: Record<string, unknown>) {
  confirmationStatus.value = 'unprompted';
  const prompted = await tool.handler(toolParams, mockContext);
  if (!isToolHandlerInterruptReturn(prompted)) {
    throw new Error('Expected a confirmation prompt');
  }

  return mockAskForConfirmation.mock.calls[0][0] as { message: string; id: string };
}

// An analyst-approved call: the handler runs again with the confirmation accepted.
async function runApproved(tool: ReturnType<Case['build']>, toolParams: Record<string, unknown>) {
  confirmationStatus.value = 'accepted';

  return tool.handler(toolParams, mockContext);
}

interface Case {
  label: string;
  clientMethod: 'isolate' | 'release' | 'scan' | 'runningProcesses';
  action: string;
  build: typeof isolateHostTool;
  extraParams: Record<string, unknown>;
  // Whether the analyst confirms the dispatch. Running processes only reads.
  gated: boolean;
  privilege:
    | 'canIsolateHost'
    | 'canUnIsolateHost'
    | 'canWriteScanOperations'
    | 'canGetRunningProcesses';
}

const CASES: Case[] = [
  {
    label: 'isolate_host',
    privilege: 'canIsolateHost',
    clientMethod: 'isolate',
    action: 'isolate',
    build: isolateHostTool,
    extraParams: {},
    gated: true,
  },
  {
    label: 'unisolate_host',
    privilege: 'canUnIsolateHost',
    clientMethod: 'release',
    action: 'unisolate',
    build: unisolateHostTool,
    extraParams: {},
    gated: true,
  },
  {
    label: 'scan_host',
    privilege: 'canWriteScanOperations',
    clientMethod: 'scan',
    action: 'scan',
    build: scanHostTool as unknown as typeof isolateHostTool,
    extraParams: { path: '/tmp/x' },
    gated: true,
  },
  {
    label: 'running_processes',
    privilege: 'canGetRunningProcesses',
    clientMethod: 'runningProcesses',
    action: 'running-processes',
    build: getRunningProcessesTool,
    extraParams: {},
    gated: false,
  },
];

describe.each(CASES)(
  '$label: dispatch by agent ID',
  ({ clientMethod, action, build, extraParams, privilege, gated }) => {
    jest.setTimeout(20000);

    // Tests of the confirmation card exist only for the tools that show one.
    const itGated = (name: string, fn: () => Promise<void>) => {
      if (gated) {
        it(name, fn);
      }
    };

    let service: EndpointAppContextService;
    let client: Record<string, jest.Mock>;
    let ensureInCurrentSpace: jest.Mock;
    let getAgent: jest.Mock;
    let listAgents: jest.Mock;
    let getHostMetadataList: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      toolCallState.value = undefined;
      confirmationStatus.value = 'unprompted';
      service = createMockEndpointAppContext().service;
      getHostMetadataList = jest.fn().mockResolvedValue({ data: [], total: 0 });
      jest.spyOn(service, 'getEndpointMetadataService').mockImplementation((() => ({
        getHostMetadataList,
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
        await confirmThenDispatch(tool, { hostName: 'dup-host', ...extraParams })
      );
      const ambiguous = first[0].data as Record<string, unknown>;
      expect(ambiguous.reason).toBe('ambiguous_hostname');
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
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
        await confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams })
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

    it('uses agentId without resolving the hostname when both agree', async () => {
      const tool = build(service);

      await confirmThenDispatch(tool, { hostName: 'dup-host', agentId: 'agent-b', ...extraParams });

      expect(listAgents).not.toHaveBeenCalled();
      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-b'] })
      );
    });

    itGated(
      'records the resolved agent as the confirmed target when the card names a host',
      async () => {
        const tool = build(service);

        await cardFor(tool, { hostName: 'dup-host', agentId: 'agent-b', ...extraParams });

        // The displayed arguments travel with the confirmation: scan records
        // its `path`; tools called without a `comment` record none.
        const recordedArgs = 'path' in extraParams ? { path: extraParams.path } : undefined;
        expect(toolCallState.value).toEqual({
          kind: 'confirmed',
          action,
          agentId: 'agent-b',
          ...(recordedArgs ? { args: recordedArgs } : {}),
        });
      }
    );

    itGated(
      'does not dispatch when the host now resolves to a different agent than the confirmed one',
      async () => {
        listAgents.mockResolvedValueOnce({
          agents: [{ id: 'agent-b', status: 'online', packages: ['endpoint'] }],
        });
        const tool = build(service);

        await cardFor(tool, { hostName: 'dup-host', ...extraParams });

        // The confirmed agent goes offline and another agent answers to the same
        // hostname, so the handler's own walk would pick a host the card never
        // named.
        listAgents.mockResolvedValue({
          agents: [{ id: 'agent-a', status: 'online', packages: ['endpoint'] }],
        });

        const out = results(await runApproved(tool, { hostName: 'dup-host', ...extraParams }));

        expect(out[0].type).toBe('error');
        expect((out[0].data as Record<string, unknown>).error).toBe('invalid_argument');
        expect((out[0].data as Record<string, unknown>).message).toEqual(
          expect.stringContaining('changed after the analyst confirmed it')
        );
        expect(client[clientMethod]).not.toHaveBeenCalled();
      }
    );

    itGated('does not dispatch a call that carries no confirmation at all', async () => {
      const tool = build(service);

      const out = results(await runApproved(tool, { agentId: 'agent-b', ...extraParams }));

      expect(out[0].type).toBe('error');
      expect((out[0].data as Record<string, unknown>).message).toEqual(
        expect.stringContaining('not covered by a confirmation')
      );
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    itGated(
      'does not dispatch when a confirmed call is replayed with different arguments',
      async () => {
        // The card is the human gate on the whole request, its displayed
        // arguments included: a resumed call reusing the confirmed tool-call
        // state but swapping the comment (or, for scan, the path) must not
        // inherit the approval.
        const tool = build(service);

        await cardFor(tool, { agentId: 'agent-b', comment: 'first reason', ...extraParams });
        expect(toolCallState.value).toEqual(
          expect.objectContaining({
            kind: 'confirmed',
            args: expect.objectContaining({ comment: 'first reason' }),
          })
        );

        const out = results(
          await runApproved(tool, { agentId: 'agent-b', comment: 'swapped reason', ...extraParams })
        );

        expect(out[0].type).toBe('error');
        const data = out[0].data as Record<string, unknown>;
        expect(data.error).toBe('invalid_argument');
        expect(data.message).toEqual(
          expect.stringContaining('differ from the ones the analyst confirmed')
        );
        expect(client[clientMethod]).not.toHaveBeenCalled();
      }
    );

    it('dispatches when the replayed arguments are the ones that were confirmed', async () => {
      const tool = build(service);

      const out = results(
        await confirmThenDispatch(tool, {
          agentId: 'agent-b',
          comment: 'triage note',
          ...extraParams,
        })
      );

      const data = out[0].data as Record<string, unknown>;
      expect(data.found).not.toBe(false);
      expect(client[clientMethod]).toHaveBeenCalledTimes(1);
      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-b'] })
      );
    });

    if (!gated) {
      it('dispatches in one call, without asking the analyst to confirm', async () => {
        const tool = build(service);

        const out = results(
          await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext)
        );

        expect(mockAskForConfirmation).not.toHaveBeenCalled();
        expect(toolCallState.value).toBeUndefined();
        expect(out[0].type).not.toBe('error');
        expect(client[clientMethod]).toHaveBeenCalledTimes(1);
        expect(client[clientMethod].mock.calls[0][0]).toEqual(
          expect.objectContaining({ endpoint_ids: ['agent-b'] })
        );
      });
    }

    it('refuses a hostName that does not match the Fleet hostname of the agentId, instead of acting on the agent', async () => {
      const tool = build(service);

      const out = results(
        await tool.handler({ hostName: 'web-01', agentId: 'agent-b', ...extraParams }, mockContext)
      );

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(data.error).toBe('invalid_argument');
      expect(String(data.message)).toContain("'web-01'");
      expect(String(data.message)).toContain("'dup-host'");
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    itGated(
      'renders the confirmation card from the resolved Fleet host, not the hostName the model supplied',
      async () => {
        const tool = build(service);

        const card = await cardFor(tool, {
          hostName: 'dup-host',
          agentId: 'agent-b',
          ...extraParams,
        });

        expect(card.message).toContain('dup-host');
        expect(card.message).toContain('agent-b');
        expect(client[clientMethod]).not.toHaveBeenCalled();
      }
    );

    it('accepts the short Defend hostname of an agent whose Fleet hostname is the FQDN', async () => {
      // Agent policy hostname format is FQDN: Fleet names the agent
      // `web-01.example.com` while `list_endpoints` shows `web-01`, because
      // Defend writes the short OS hostname to the united metadata index.
      getAgent.mockResolvedValue({
        id: 'agent-b',
        status: 'online',
        packages: ['endpoint'],
        local_metadata: { host: { name: 'web-01.example.com' } },
      });
      getHostMetadataList.mockResolvedValue({
        data: [
          {
            metadata: {
              elastic: { agent: { id: 'agent-b' } },
              host: { hostname: 'web-01' },
            },
          },
        ],
        total: 1,
      });
      const tool = build(service);

      const out = results(
        await confirmThenDispatch(tool, { hostName: 'web-01', agentId: 'agent-b', ...extraParams })
      );

      expect(out[0].type).not.toBe('error');
      expect(client[clientMethod]).toHaveBeenCalledTimes(1);
      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-b'] })
      );
    });

    it("reads the Defend hostnames keyed on the supplied agent id, so another agent's alias is never accepted", async () => {
      const tool = build(service);

      await confirmThenDispatch(tool, { hostName: 'dup-host', agentId: 'agent-b', ...extraParams });

      expect(getHostMetadataList).toHaveBeenCalledWith(
        expect.objectContaining({
          kuery: expect.stringContaining('agent-b'),
        }),
        undefined
      );
    });

    it('still refuses a hostname the agent is not known by, even when Defend names it too', async () => {
      getAgent.mockResolvedValue({
        id: 'agent-b',
        status: 'online',
        packages: ['endpoint'],
        local_metadata: { host: { name: 'dup-host' } },
      });
      getHostMetadataList.mockResolvedValue({
        data: [
          {
            metadata: {
              elastic: { agent: { id: 'agent-b' } },
              host: { hostname: 'dup-host-short' },
            },
          },
        ],
        total: 1,
      });
      const tool = build(service);

      const out = results(
        await tool.handler({ hostName: 'web-01', agentId: 'agent-b', ...extraParams }, mockContext)
      );

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(data.error).toBe('invalid_argument');
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('refuses without a confirmation card when the hostName and agentId name different hosts', async () => {
      const tool = build(service);

      const out = results(
        await tool.handler({ hostName: 'web-01', agentId: 'agent-b', ...extraParams }, mockContext)
      );

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(data.error).toBe('invalid_argument');
      expect(String(data.message)).toContain("'web-01'");
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('returns the not-found result without a confirmation card when the agent cannot be resolved', async () => {
      getAgent.mockResolvedValue({ id: 'agent-b', packages: ['system'] });
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      expect((out[0].data as Record<string, unknown>).reason).toBe('endpoint_not_found');
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('refuses before the prompt when the analyst lacks the endpoint privilege', async () => {
      service.getEndpointAuthz = jest
        .fn()
        .mockResolvedValue(getEndpointAuthzInitialStateMock({ [privilege]: false }));
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(data.error).toBe('insufficient_privileges');
      expect(data.privilege).toBe(privilege);
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('returns an error result without a confirmation card when the privilege read fails', async () => {
      service.getEndpointAuthz = jest
        .fn()
        .mockRejectedValue(new Error('kibana system unavailable'));
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(String(data.message)).toContain('kibana system unavailable');
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('returns an error result without a confirmation card when the target lookup fails', async () => {
      getAgent.mockRejectedValue(new Error('fleet search failed'));
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(String(data.message)).toContain('fleet search failed');
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    itGated(
      'shows the model-written comment on the card, since it is logged under the analyst',
      async () => {
        const tool = build(service);

        const card = await cardFor(tool, {
          agentId: 'agent-b',
          comment: 'Per ticket SEC-42',
          ...extraParams,
        });

        expect(card.message).toContain('Per ticket SEC-42');
      }
    );

    it.each(['user', 'mcp', 'unknown'] as const)(
      'refuses a %s call source without dispatching, so the confirmation gate cannot be bypassed',
      async (callSource) => {
        const tool = build(service);

        const out = results(
          await tool.handler({ agentId: 'agent-b', ...extraParams }, {
            ...mockContext,
            callContext: { callSource },
          } as unknown as ToolHandlerContext)
        );

        expect(out[0].type).toBe('error');
        expect((out[0].data as Record<string, unknown>).error).toBe('invalid_argument');
        expect(getAgent).not.toHaveBeenCalled();
        expect(client[clientMethod]).not.toHaveBeenCalled();
      }
    );

    it('scopes both lookup paths to Elastic Defend agents', async () => {
      getAgent.mockResolvedValue({
        id: 'agent-s1',
        packages: ['sentinel_one'],
        local_metadata: { host: { name: 'dup-host' } },
      });
      const tool = build(service);

      const byId = results(
        await tool.handler({ agentId: 'agent-s1', ...extraParams }, mockContext)
      );

      expect((byId[0].data as Record<string, unknown>).reason).toBe('endpoint_not_found');
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('refuses without securitySolution access even when the endpoint privilege is held, and dispatches nothing', async () => {
      // The HTTP routes require `securitySolution` on top of the sub-feature
      // privilege; a role with only e.g. `host_isolation_all` gets a 403 there.
      service.getEndpointAuthz = jest
        .fn()
        .mockResolvedValue(getEndpointAuthzInitialStateMock({ canReadSecuritySolution: false }));
      const tool = build(service);

      const out = results(await confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams }));

      const data = out[0].data as Record<string, unknown>;
      expect(out[0].type).toBe('error');
      expect(data.error).toBe('insufficient_privileges');
      expect(data.privilege).toBe('canReadSecuritySolution');
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('refuses before the prompt when securitySolution access is missing', async () => {
      service.getEndpointAuthz = jest
        .fn()
        .mockResolvedValue(getEndpointAuthzInitialStateMock({ canReadSecuritySolution: false }));
      const tool = build(service);

      const out = results(await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext));

      expect((out[0].data as Record<string, unknown>).privilege).toBe('canReadSecuritySolution');
      expect(mockAskForConfirmation).not.toHaveBeenCalled();
      expect(toolCallState.value).toBeUndefined();
    });

    it.each(['unenrolled', 'uninstalled'])(
      'refuses an %s agent ID instead of dispatching an action nothing will pick up',
      async (fleetStatus) => {
        getAgent.mockResolvedValue({
          id: 'agent-b',
          status: fleetStatus,
          packages: ['endpoint'],
          local_metadata: { host: { name: 'dup-host' } },
        });
        const tool = build(service);

        const out = results(
          await tool.handler({ agentId: 'agent-b', ...extraParams }, mockContext)
        );
        const data = out[0].data as Record<string, unknown>;
        expect(data.found).toBe(false);
        expect(data.reason).toBe('endpoint_not_active');
        expect(data.agentId).toBe('agent-b');
        expect(mockAskForConfirmation).not.toHaveBeenCalled();
        expect(client[clientMethod]).not.toHaveBeenCalled();
      }
    );

    it('refuses a hostname whose only match is unenrolled', async () => {
      listAgents.mockResolvedValue({
        agents: [{ id: 'agent-a', status: 'unenrolled', packages: ['endpoint'] }],
      });
      const tool = build(service);

      const out = results(
        await tool.handler({ hostName: 'dup-host', ...extraParams }, mockContext)
      );

      expect((out[0].data as Record<string, unknown>).reason).toBe('endpoint_not_active');
      expect(client[clientMethod]).not.toHaveBeenCalled();
    });

    it('still dispatches to the live agent when an unenrolled record shares the hostname', async () => {
      listAgents.mockResolvedValue({
        agents: [
          { id: 'old-agent', status: 'unenrolled', packages: ['endpoint'] },
          { id: 'agent-live', status: 'online', packages: ['endpoint'] },
        ],
      });
      const tool = build(service);

      await confirmThenDispatch(tool, { hostName: 'dup-host', ...extraParams });

      expect(client[clientMethod].mock.calls[0][0]).toEqual(
        expect.objectContaining({ endpoint_ids: ['agent-live'] })
      );
    });

    itGated(
      'labels the host by agent ID, never by the model-supplied hostName, when Fleet records no name',
      async () => {
        getAgent.mockResolvedValue({ id: 'agent-b', status: 'online', packages: ['endpoint'] });
        const tool = build(service);
        const params = { hostName: 'attacker-chosen-name', agentId: 'agent-b', ...extraParams };

        const card = await cardFor(tool, params);
        expect(card.message).not.toContain('attacker-chosen-name');
        expect(card.message).toContain('agent-b');

        await runApproved(tool, params);
        const [payload, metadata] = client[clientMethod].mock.calls[0];
        expect(JSON.stringify(payload)).not.toContain('attacker-chosen-name');
        expect(JSON.stringify(metadata)).not.toContain('attacker-chosen-name');
        expect(metadata).toEqual({ hosts: { 'agent-b': { name: 'agent-b' } } });
      }
    );

    it('includes why the action failed in the result', async () => {
      mockGetActionDetailsById.mockResolvedValue({
        id: 'action-1',
        status: 'failed',
        wasSuccessful: false,
        isCompleted: true,
        errors: ['agent was offline', 'policy denied the action'],
      });
      const tool = build(service);

      const out = results(await confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams }));
      const data = out[0].data as Record<string, unknown>;

      expect(data.status).toBe('failed');
      expect(data.errors).toEqual(['agent was offline', 'policy denied the action']);
      expect(data.totalErrors).toBe(2);
    });

    it('says the action may already have been sent, and must not be retried, when a step after the dispatch throws', async () => {
      // The client sends the command through Fleet before it writes the request
      // document, so a throw from the client call does not prove nothing went out.
      client[clientMethod].mockRejectedValue(new Error('failed to write action doc'));
      const tool = build(service);

      const out = results(await confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams }));
      const data = out[0].data as Record<string, unknown>;

      expect(out[0].type).toBe('error');
      expect(data.error).toBe('unknown_error');
      expect(String(data.message)).toContain('failed to write action doc');
      expect(String(data.message)).toContain('may already have been sent');
      expect(String(data.message)).toContain('Do NOT retry');
      expect(String(data.message)).toContain('get_response_action_status');
      expect(data.actionMayHaveBeenSent).toBe(true);
    });

    it('does not claim the action may have been sent when the failure precedes the dispatch', async () => {
      service.getInternalResponseActionsClient = jest.fn(() => {
        throw new Error('client unavailable');
      }) as unknown as EndpointAppContextService['getInternalResponseActionsClient'];
      const tool = build(service);

      const out = results(await confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams }));
      const data = out[0].data as Record<string, unknown>;

      expect(data.error).toBe('unknown_error');
      expect(String(data.message)).toContain('client unavailable');
      expect(String(data.message)).not.toContain('may already have been sent');
      expect(data.actionMayHaveBeenSent).toBeUndefined();
    });

    it('keeps the dispatched action ID when every completion read fails', async () => {
      jest.useFakeTimers();
      try {
        mockGetActionDetailsById.mockRejectedValue(new Error('es unavailable'));
        const tool = build(service);

        const pending = confirmThenDispatch(tool, { agentId: 'agent-b', ...extraParams });
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
