/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RunAgentFn, RunAgentReturn } from '@kbn/agent-builder-server/agents';
import type { ConversationRound } from '@kbn/agent-builder-common';

import { invokeAgent, type InvokeAgentResult } from '.';

const mockRequest = {} as KibanaRequest;

const createMockRound = (message: string): ConversationRound =>
  ({
    id: 'round-1',
    response: { message },
    status: 'completed',
  } as unknown as ConversationRound);

const createMockRunAgent = (response: RunAgentReturn | Error): jest.MockedFunction<RunAgentFn> => {
  const fn = jest.fn<ReturnType<RunAgentFn>, Parameters<RunAgentFn>>();

  if (response instanceof Error) {
    fn.mockRejectedValue(response);
  } else {
    fn.mockResolvedValue(response);
  }

  return fn;
};

describe('invokeAgent', () => {
  const baseParams = {
    agentId: 'test-agent',
    connectorId: 'test-connector',
    message: 'Generate an alert retrieval workflow for high-severity alerts',
    request: mockRequest,
  };

  it('returns a successful result with the assistant response message', async () => {
    const expectedMessage = 'Here is your workflow YAML...';
    const mockRunAgent = createMockRunAgent({
      result: { round: createMockRound(expectedMessage) },
    });

    const result: InvokeAgentResult = await invokeAgent({
      ...baseParams,
      runAgent: mockRunAgent,
    });

    expect(result).toEqual({
      ok: true,
      responseMessage: expectedMessage,
    });
  });

  it('passes the correct RunAgentParams to runAgent', async () => {
    const mockRunAgent = createMockRunAgent({
      result: { round: createMockRound('response') },
    });

    await invokeAgent({
      ...baseParams,
      runAgent: mockRunAgent,
    });

    expect(mockRunAgent).toHaveBeenCalledWith({
      agentId: 'test-agent',
      agentParams: {
        configurationOverrides: undefined,
        nextInput: {
          message: baseParams.message,
        },
      },
      defaultConnectorId: 'test-connector',
      request: mockRequest,
    });
  });

  it('passes the abortSignal when provided', async () => {
    const mockRunAgent = createMockRunAgent({
      result: { round: createMockRound('response') },
    });
    const abortController = new AbortController();

    await invokeAgent({
      ...baseParams,
      abortSignal: abortController.signal,
      runAgent: mockRunAgent,
    });

    expect(mockRunAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: abortController.signal,
      })
    );
  });

  it('passes configurationOverrides to runAgent when provided', async () => {
    const mockRunAgent = createMockRunAgent({
      result: { round: createMockRound('response') },
    });
    const configurationOverrides = {
      instructions: 'Custom skill instructions',
      tools: [{ tool_ids: ['platform.core.generate_esql'] }],
    };

    await invokeAgent({
      ...baseParams,
      configurationOverrides,
      runAgent: mockRunAgent,
    });

    expect(mockRunAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agentParams: expect.objectContaining({
          configurationOverrides,
        }),
      })
    );
  });

  it('returns a failure when the agent returns an empty response message', async () => {
    const mockRunAgent = createMockRunAgent({
      result: { round: createMockRound('') },
    });

    const result = await invokeAgent({
      ...baseParams,
      runAgent: mockRunAgent,
    });

    expect(result).toEqual({
      error: 'Agent returned an empty response message',
      ok: false,
    });
  });

  it('returns a failure when runAgent throws an error', async () => {
    const mockRunAgent = createMockRunAgent(new Error('Connection timeout'));

    const result = await invokeAgent({
      ...baseParams,
      runAgent: mockRunAgent,
    });

    expect(result).toEqual({
      error: 'Failed to invoke agent: Connection timeout',
      ok: false,
    });
  });

  it('returns a failure when runAgent throws a non-Error value', async () => {
    const mockRunAgent = jest
      .fn()
      .mockRejectedValue('unexpected failure') as unknown as jest.MockedFunction<RunAgentFn>;

    const result = await invokeAgent({
      ...baseParams,
      runAgent: mockRunAgent,
    });

    expect(result).toEqual({
      error: 'Failed to invoke agent: unexpected failure',
      ok: false,
    });
  });
});
