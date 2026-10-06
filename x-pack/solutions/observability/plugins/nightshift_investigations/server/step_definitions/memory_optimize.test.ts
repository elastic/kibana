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
  const getScopedEsClient = jest.fn().mockReturnValue(esClient);
  const getMemoryEsClient = jest.fn().mockResolvedValue(esClient);
  const getFakeRequest = jest.fn().mockReturnValue(request);
  const getAgentBuilder = jest.fn();
  const getInference = jest.fn();
  const getSavedObjects = jest.fn();
  const getUiSettings = jest.fn();
  const telemetry = {
    reportSemanticMemoryMaterialized: jest.fn(),
    reportSemanticMemoryOptimized: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getScopedEsClient.mockReturnValue(esClient);
    getMemoryEsClient.mockResolvedValue(esClient);
    getFakeRequest.mockReturnValue(request);
  });

  const createContext = (
    input: {
      prompt: string;
      response: string;
      agent_id?: string;
      recalled_ids?: string[];
      sandbox_id?: string;
      round_connector_id?: string;
      conversation_id?: string;
      round_id?: string;
      tool_calls?: unknown;
      tool_results?: unknown;
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

  it('optimizes with the injected internal client and never the scoped client', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'nightshift.investigation',
        recalled_ids: ['memory_a'],
        sandbox_id: 'default__conv-1',
        conversation_id: 'conv-1',
        round_id: 'round-1',
        tool_calls: [
          { tool_id: 'nightshift_sandbox_bash', tool_call_id: 'tc-1', params: { command: 'ls' } },
          { tool_id: 'nightshift_sandbox_bash', tool_call_id: 'tc-2', params: { command: 'pwd' } },
        ],
        tool_results: [
          {
            tool_id: 'nightshift_sandbox_bash',
            tool_call_id: 'tc-1',
            results: [{ type: 'other', data: { stdout: 'a b' } }],
          },
        ],
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions.',
      toolCalls: [
        {
          tool_id: 'nightshift_sandbox_bash',
          tool_call_id: 'tc-1',
          params: { command: 'ls' },
          results: [{ type: 'other', data: { stdout: 'a b' } }],
        },
        { tool_id: 'nightshift_sandbox_bash', tool_call_id: 'tc-2', params: { command: 'pwd' } },
      ],
      conversationId: 'conv-1',
      roundId: 'round-1',
      recalledIds: ['memory_a'],
      esClient,
      spaceId: 'default',
      signal: expect.any(AbortSignal),
      logger: expect.anything(),
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      requestedConnectorId: undefined,
      roundConnectorId: undefined,
      interactionId: 'workflow-exec-1',
    });
    expect(getMemoryEsClient).toHaveBeenCalledTimes(1);
    expect(getScopedEsClient).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { status: 'ok' } });
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'nightshift.investigation',
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

  it('derives the storage boundary from trusted workflow context, not caller inputs', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext(
        {
          prompt: 'why is checkout slow?',
          response: 'Redis evictions.',
          agent_id: 'nightshift.investigation',
          recalled_ids: ['memory_a'],
          sandbox_id: 'attacker-selected-space__conv-1',
          conversation_id: 'attacker-selected-space__conv-1',
          round_id: 'round-1',
        },
        'trusted-space'
      )
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'trusted-space',
        recalledIds: ['memory_a'],
      })
    );
  });

  it('defaults an absent persisted recalled set to empty', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext(
        {
          prompt: 'why is checkout slow?',
          response: 'Redis evictions.',
          agent_id: 'nightshift.investigation',
          sandbox_id: 'marketing__conv-1',
        },
        'marketing'
      )
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({
        recalledIds: [],
      })
    );
  });

  it('skips when the memory flag is off', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      isEnabled: () => false,
      telemetry: telemetry as never,
    });

    const result = await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'nightshift.investigation',
        sandbox_id: 'default__conv-1',
      })
    );

    expect(runMemoryOptimize).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { status: 'ok', skipped: true } });
  });

  it('forwards the round connector as the lenient round model', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext({
        prompt: 'why is checkout slow?',
        response: 'Redis evictions.',
        agent_id: 'nightshift.investigation',
        sandbox_id: 'default__conv-1',
        round_connector_id: 'anthropic-sonnet',
      })
    );

    expect(runMemoryOptimize).toHaveBeenCalledWith(
      expect.objectContaining({ roundConnectorId: 'anthropic-sonnet' })
    );
  });

  it('reports one failure event and rethrows when optimize fails', async () => {
    runMemoryOptimizeMock.mockRejectedValueOnce(new Error('model failed'));
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext({
          prompt: 'why?',
          response: 'because',
          agent_id: 'nightshift.investigation',
          conversation_id: 'conv-1',
          round_id: 'round-1',
        })
      )
    ).rejects.toThrow('model failed');
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledTimes(1);
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'nightshift.investigation',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
    });
  });

  it.each([undefined, 'agent-1'])(
    'skips without touching Memory when the agent is %s',
    async (agentId) => {
      const definition = memoryOptimizeStepDefinition({
        getAgentBuilder,
        getInference,
        getSavedObjects,
        getUiSettings,
        getMemoryEsClient,
        logger: loggerMock.create(),
        telemetry: telemetry as never,
      });

      const result = await definition.handler(
        createContext({ prompt: 'why?', response: 'because', agent_id: agentId })
      );

      expect(result).toEqual({ output: { status: 'ok', skipped: true } });
      expect(runMemoryOptimize).not.toHaveBeenCalled();
      expect(getMemoryEsClient).not.toHaveBeenCalled();
    }
  );

  it('reports a failure outcome when the target agent cannot resolve a model', async () => {
    runMemoryOptimizeMock.mockResolvedValueOnce(undefined);
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await definition.handler(
      createContext({
        prompt: 'why?',
        response: 'because',
        agent_id: 'nightshift.investigation',
        conversation_id: 'conv-1',
        round_id: 'round-1',
      })
    );

    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'nightshift.investigation',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
    });
  });

  it('reports one failure event and fails the step when required writes fail', async () => {
    runMemoryOptimizeMock.mockResolvedValueOnce({
      recalledCount: 1,
      loadedCount: 1,
      usefulCount: 0,
      harmfulCount: 0,
      extractionProposedCount: 1,
      standaloneUpsertCount: 0,
      safetySkipCount: 0,
      mergeAttemptCount: 0,
      mergeSuccessCount: 0,
      harmfulArchiveCount: 0,
      mergedSourceArchiveCount: 0,
      writeFailureCount: 2,
    });
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient,
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext({
          prompt: 'why?',
          response: 'because',
          agent_id: 'nightshift.investigation',
          conversation_id: 'conv-1',
          round_id: 'round-1',
        })
      )
    ).rejects.toThrow('Memory optimize failed to persist 2 required operation(s)');
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledTimes(1);
    expect(telemetry.reportSemanticMemoryOptimized).toHaveBeenCalledWith({
      agent_id: 'nightshift.investigation',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'workflow-exec-1',
      outcome: 'failure',
      write_failure_count: 2,
    });
  });

  it('fails clearly when the internal Memory client is unavailable', async () => {
    const definition = memoryOptimizeStepDefinition({
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      getMemoryEsClient: async () => {
        throw new Error('Semantic Memory internal Elasticsearch client is unavailable');
      },
      logger: loggerMock.create(),
      telemetry: telemetry as never,
    });

    await expect(
      definition.handler(
        createContext({
          prompt: 'why?',
          response: 'because',
          agent_id: 'nightshift.investigation',
        })
      )
    ).rejects.toThrow('Semantic Memory internal Elasticsearch client is unavailable');
    expect(getScopedEsClient).not.toHaveBeenCalled();
  });
});
