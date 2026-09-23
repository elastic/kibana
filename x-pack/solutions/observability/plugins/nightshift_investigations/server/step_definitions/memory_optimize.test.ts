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
  runMemoryOptimize: jest.fn().mockResolvedValue({
    recalledCount: 3,
    loadedCount: 3,
    usefulCount: 2,
    harmfulCount: 1,
    extractionProposedCount: 2,
    standaloneUpsertCount: 1,
    safetySkipCount: 0,
    mergeAttemptCount: 1,
    mergeSuccessCount: 1,
    harmfulArchiveCount: 1,
    mergedSourceArchiveCount: 2,
    writeFailureCount: 0,
  }),
}));

const runMemoryOptimizeMock = jest.mocked(runMemoryOptimize);

describe('memoryOptimizeStepDefinition', () => {
  const esClient = { search: jest.fn() };
  const request = { headers: {} };
  const mockSession = { readFiles: jest.fn() } as unknown as SandboxSession;
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getAgentBuilder = jest.fn();
  const telemetry = {
    reportSemanticMemoryMaterialized: jest.fn(),
    reportSemanticMemoryOptimized: jest.fn(),
  };

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
      connector_id?: string;
      conversation_id?: string;
      round_id?: string;
    },
    spaceId = 'default'
  ) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest
          .fn()
          .mockReturnValue({ workflow: { spaceId }, execution: { id: 'workflow-exec-1' } }),
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

  it('optimizes with the request-scoped ES client and obtained sandbox_id', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'significant-events.deductive-investigation',
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        round_id: 'round-1',
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
      getAgentBuilder,
      connectorId: undefined,
    });
    expect(result).toEqual({ output: { status: 'ok' } });
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'significant-events.deductive-investigation',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'success',
      recalled_count: 3,
      loaded_count: 3,
      useful_count: 2,
      harmful_count: 1,
      extraction_proposed_count: 2,
      standalone_upsert_count: 1,
      safety_skip_count: 0,
      merge_attempt_count: 1,
      merge_success_count: 1,
      harmful_archive_count: 1,
      merged_source_archive_count: 2,
      write_failure_count: 0,
    });
  });

  it('uses the obtained sandbox_id without re-scoping it', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
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
      getAgentBuilder,
      getSandboxStart: () => undefined,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
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
      getAgentBuilder,
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      isEnabled: () => false,
      telemetry: telemetry as never,
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

  it('forwards the Agent Builder connector id from the round', async () => {
    const sandboxStart = makeSandboxStart();
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getSandboxStart: () => sandboxStart,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'significant-events.deductive-investigation',
        sandbox_id: 'default__conv-1',
        connector_id: 'anthropic-sonnet',
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'anthropic-sonnet' })
    );
  });

  it('reports one failure event and rethrows when optimize fails', async () => {
    runMemoryOptimizeMock.mockRejectedValueOnce(new Error('model failed'));
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext({
          prompt: 'why?',
          response: 'because',
          agent_id: 'agent-1',
          conversation_id: 'conv-1',
          round_id: 'round-1',
        })
      )
    ).rejects.toThrow('model failed');
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledTimes(1);
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
    });
  });

  it('reports a failure outcome when the target agent cannot resolve a model', async () => {
    runMemoryOptimizeMock.mockResolvedValueOnce(undefined);
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getSandboxStart: () => makeSandboxStart(),
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext({
        prompt: 'why?',
        response: 'because',
        agent_id: 'significant-events.deductive-investigation',
        conversation_id: 'conv-1',
        round_id: 'round-1',
      })
    );

    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'significant-events.deductive-investigation',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
    });
  });
});
