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
  const getSearchInferenceEndpoints = jest.fn();
  const analytics = coreMock.createSetup().analytics;

  const createContext = (input: {
    prompt: string;
    response: string;
    agent_id?: string;
    conversation_id?: string;
    round_id?: string;
    tool_calls?: unknown;
  }) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
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
      getSearchInferenceEndpoints,
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
      signal: expect.any(AbortSignal),
      analytics,
      conversationId: 'conv-1',
      roundId: 'round-1',
      logger: expect.anything(),
      getInference,
      getSearchInferenceEndpoints,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });

  it('passes no tool calls when the round did not report any', async () => {
    const definition = cortexOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      analytics,
      logger: loggerMock.create(),
    });

    await definition.handler(
      createContext({ prompt: 'hi', response: 'hello', agent_id: 'nightshift.investigation' })
    );

    expect(runCortexOptimize).toHaveBeenLastCalledWith(expect.objectContaining({ toolCalls: [] }));
  });
});
