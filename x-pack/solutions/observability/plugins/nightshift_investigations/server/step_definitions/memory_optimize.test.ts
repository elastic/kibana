/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { runMemoryOptimize } from '../memory/register_memory';
import { memoryOptimizeStepDefinition } from './memory_optimize';

jest.mock('../memory/register_memory', () => ({
  runMemoryOptimize: jest.fn().mockResolvedValue(undefined),
}));

describe('memoryOptimizeStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const request = { headers: {} };
  const apiClient = { readFiles: jest.fn() };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getInference = jest.fn();
  const getSearchInferenceEndpoints = jest.fn();

  const createContext = (input: {
    prompt: string;
    response: string;
    agent_id?: string;
    conversation_id?: string;
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
      stepId: 'optimize_memory',
      stepType: 'nightshift.memoryOptimize',
    } as never);

  it('optimizes with the request-scoped ES client and scoped sandbox conversation', async () => {
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getConnectionManager: () => ({ apiClient } as never),
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'significant-events.deductive-investigation',
        conversation_id: 'conv-1',
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith({
      request,
      agentId: 'significant-events.deductive-investigation',
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      conversationId: 'default__conv-1',
      apiClient,
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
      getInference,
      getSearchInferenceEndpoints,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });

  it('still runs when the sandbox is not configured so ratings are skipped, not thrown', async () => {
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getConnectionManager: () => undefined,
      logger: loggerMock.create(),
    });

    await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        conversation_id: 'conv-1',
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'default__conv-1',
        apiClient: undefined,
      })
    );
  });
});
