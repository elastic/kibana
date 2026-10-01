/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { runCortexOptimize } from '../cortex/register_cortex';
import { cortexOptimizeStepDefinition } from './cortex_optimize';

jest.mock('../cortex/register_cortex', () => ({
  runCortexOptimize: jest.fn().mockResolvedValue(undefined),
}));

describe('cortexOptimizeStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const request = { headers: {} };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getInference = jest.fn();
  const getSavedObjects = jest.fn();
  const getUiSettings = jest.fn();
  const analytics = coreMock.createSetup().analytics;

  const createContext = (input: {
    prompt: string;
    response: string;
    agent_id?: string;
    conversation_id?: string;
    round_id?: string;
    tool_calls?: unknown;
    tool_results?: unknown;
    connector_id?: string;
    round_connector_id?: string;
  }) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({
          workflow: { spaceId: 'default' },
          execution: { id: 'execution-1' },
        }),
        getFakeRequest,
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'optimize_cortex',
      stepType: 'nightshift.cortexOptimize',
    } as never);

  it('optimizes with the request-scoped ES client', async () => {
    const definition = cortexOptimizeStepDefinition({
      getInference,
      getSavedObjects,
      getUiSettings,
      analytics,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'nightshift.investigation',
        conversation_id: 'conv-1',
        round_id: 'round-1',
        tool_calls: [{ tool_id: 'nightshift.sandbox_bash', params: { command: 'ls' } }],
        connector_id: 'manual-model',
        round_connector_id: 'round-model',
      })
    );

    expect(runCortexOptimize).toHaveBeenCalledWith({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      toolCalls: [{ tool_id: 'nightshift.sandbox_bash', params: { command: 'ls' } }],
      esClient,
      spaceId: 'default',
      interactionId: 'execution-1',
      signal: expect.any(AbortSignal),
      analytics,
      conversationId: 'conv-1',
      roundId: 'round-1',
      requestedConnectorId: 'manual-model',
      roundConnectorId: 'round-model',
      logger: expect.anything(),
      getInference,
      getSavedObjects,
      getUiSettings,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });

  it('passes no tool calls when the round did not report any', async () => {
    const definition = cortexOptimizeStepDefinition({
      getInference,
      getSavedObjects,
      getUiSettings,
      analytics,
      logger: loggerMock.create(),
    });

    await definition.handler(
      createContext({ prompt: 'hi', response: 'hello', agent_id: 'nightshift.investigation' })
    );

    expect(runCortexOptimize).toHaveBeenLastCalledWith(expect.objectContaining({ toolCalls: [] }));
  });

  it('attaches each tool call its results by tool_call_id', async () => {
    const definition = cortexOptimizeStepDefinition({
      getInference,
      getSavedObjects,
      getUiSettings,
      analytics,
      logger: loggerMock.create(),
    });
    const results = [{ type: 'other', data: { stdout: 'pool exhausted' } }];

    await definition.handler(
      createContext({
        prompt: 'hi',
        response: 'hello',
        agent_id: 'nightshift.investigation',
        tool_calls: [
          { tool_id: 'nightshift.sandbox_bash', tool_call_id: 'tc-1', params: { command: 'a' } },
          { tool_id: 'nightshift.sandbox_bash', tool_call_id: 'tc-2', params: { command: 'b' } },
        ],
        tool_results: [{ tool_id: 'nightshift.sandbox_bash', tool_call_id: 'tc-1', results }],
      })
    );

    expect(runCortexOptimize).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toolCalls: [
          {
            tool_id: 'nightshift.sandbox_bash',
            tool_call_id: 'tc-1',
            params: { command: 'a' },
            results,
          },
          { tool_id: 'nightshift.sandbox_bash', tool_call_id: 'tc-2', params: { command: 'b' } },
        ],
      })
    );
  });
});
