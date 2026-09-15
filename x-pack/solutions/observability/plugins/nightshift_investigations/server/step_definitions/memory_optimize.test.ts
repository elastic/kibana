/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { optimizeMemory } from '../memory/optimize';
import { memoryOptimizeStepDefinition } from './memory_optimize';

jest.mock('../memory/optimize', () => ({
  optimizeMemory: jest.fn().mockResolvedValue(undefined),
  createLlmProposeMemoryEdits: jest.fn().mockReturnValue(jest.fn()),
}));

describe('memoryOptimizeStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const request = { headers: {} };
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getInference = jest.fn().mockReturnValue({ getClient: jest.fn() });
  const getSearchInferenceEndpoints = jest.fn().mockReturnValue({
    endpoints: {
      getForFeature: jest.fn().mockResolvedValue({ endpoints: [{ connectorId: 'test-connector' }] }),
    },
  });

  const createContext = (input: { prompt: string; response: string }) =>
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

  it('optimizes memory using the request-scoped ES client and MemoryService', async () => {
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
      })
    );

    expect(optimizeMemory).toHaveBeenCalledWith({
      memoryService: expect.any(Object),
      esClient,
      proposeEdits: expect.any(Function),
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      logger: expect.anything(),
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });
});
