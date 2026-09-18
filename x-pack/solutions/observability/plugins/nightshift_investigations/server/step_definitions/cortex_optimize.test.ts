/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
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

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
    getFakeRequest.mockReturnValue(request);
  });

  const createContext = (input: { prompt: string; response: string; agent_id?: string }) =>
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
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'nightshift.investigation',
      })
    );

    expect(runCortexOptimize).toHaveBeenCalledWith({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
      getInference,
      getSearchInferenceEndpoints,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });

  it('skips when the cortex flag is off', async () => {
    const definition = cortexOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      logger: loggerMock.create(),
      isEnabled: () => false,
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
      })
    );

    expect(runCortexOptimize).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { status: 'ok', skipped: true } });
  });
});
