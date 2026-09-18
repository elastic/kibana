/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { runMemoryOptimize } from '../memory/register_memory';
import { memoryOptimizeStepDefinition } from './memory_optimize';

jest.mock('../memory/register_memory', () => ({
  runMemoryOptimize: jest.fn().mockResolvedValue(undefined),
}));

describe('memoryOptimizeStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const request = { headers: {} };
  const mockSession = { readFiles: jest.fn() } as unknown as SandboxSession;
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getInference = jest.fn();
  const getSearchInferenceEndpoints = jest.fn();

  const makeSandboxStart = (): SandboxPluginStart => ({
    getSession: jest.fn(),
    getSessionForSpace: jest.fn().mockReturnValue(mockSession),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
    getFakeRequest.mockReturnValue(request);
  });

  const createContext = (
    input: {
      prompt: string;
      response: string;
      agent_id?: string;
      sandbox_id?: string;
    },
    spaceId = 'default'
  ) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId } }),
        getFakeRequest,
        getScopedEsClient,
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'optimize_memory',
      stepType: 'nightshift.memoryOptimize',
    }) as never;

  it('optimizes with the request-scoped ES client and obtained sandbox_id', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'significant-events.deductive-investigation',
        sandbox_id: 'default__conv-1',
      })
    );

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('default', 'conv-1');
    expect(runMemoryOptimize).toHaveBeenCalledWith({
      request,
      agentId: 'significant-events.deductive-investigation',
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      session: mockSession,
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
      getInference,
      getSearchInferenceEndpoints,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
  });

  it('does not re-scope an obtained sandbox_id', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
    });

    await definition.handler(
      createContext(
        {
          prompt: 'why is checkout slow?',
          response: 'Redis evictions.',
          sandbox_id: 'marketing__conv-1',
        },
        'marketing'
      )
    );

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('marketing', 'conv-1');
  });

  it('still runs when the sandbox is not configured so ratings are skipped, not thrown', async () => {
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
    });

    await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        sandbox_id: 'default__conv-1',
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({
        session: undefined,
      })
    );
  });

  it('skips when the memory flag is off', async () => {
    const definition = memoryOptimizeStepDefinition({
      getInference,
      getSearchInferenceEndpoints,
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      isEnabled: () => false,
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        sandbox_id: 'default__conv-1',
      })
    );

    expect(runMemoryOptimize).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { status: 'ok', skipped: true } });
  });
});
