/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { createMemoryStore, loadRoundSteps, runMemoryOptimize } from './register_memory';
import { optimizeMemory } from './optimize';

// Mirrors the resolver's precedence; the resolver itself is covered in @kbn/nightshift-ai.
jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: jest.fn(
    async ({
      requestedId,
      roundConnectorId,
    }: {
      requestedId?: string;
      roundConnectorId?: string;
    }) => requestedId || roundConnectorId || 'nightshift-default'
  ),
}));

jest.mock('./optimize', () => ({
  createLlmProposeMemoryExtractions: jest.fn(() => jest.fn()),
  createLlmProposeMemoryLabels: jest.fn(() => jest.fn()),
  createLlmSynthesizeMemoryGroup: jest.fn(() => jest.fn()),
  optimizeMemory: jest.fn(),
}));

describe('createMemoryStore', () => {
  it('creates a space-scoped store without an agent boundary', () => {
    expect(
      createMemoryStore({
        esClient: {} as never,
        logger: loggerMock.create(),
        spaceId: 'default',
      })
    ).toBeDefined();
  });
});

describe('runMemoryOptimize', () => {
  const request = { headers: {} } as never;
  const createModelProvider = jest.fn();
  const getAgentBuilder = jest.fn();
  const getInference = jest.fn().mockReturnValue({});
  const getSavedObjects = jest.fn().mockReturnValue({});
  const getUiSettings = jest.fn().mockReturnValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockResolvedValue({
        inferenceClient: { output: jest.fn() },
        connector: { connectorId: 'connector-1' },
      }),
    });
    getAgentBuilder.mockReturnValue({ runtime: { createModelProvider } });
    getInference.mockReturnValue({});
    getSavedObjects.mockReturnValue({});
    getUiSettings.mockReturnValue({});
  });

  it('attributes inherited connector calls to the Nightshift investigation feature', async () => {
    await runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: [],
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      roundConnectorId: 'anthropic-sonnet',
      interactionId: 'execution-1',
    });

    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'anthropic-sonnet',
      telemetryMetadata: {
        pluginId: SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
        productSolution: SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION,
        productFeature: SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE,
        interactionId: 'execution-1',
      },
    });
    expect(optimizeMemory).toHaveBeenCalled();
  });

  const runWithModels = (models: { requestedConnectorId?: string; roundConnectorId?: string }) =>
    runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: [],
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      interactionId: 'execution-1',
      ...models,
    });

  it('treats connector_id as a strict override over the round model', async () => {
    await runWithModels({ requestedConnectorId: 'manual-model', roundConnectorId: 'round-model' });

    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ defaultConnectorId: 'manual-model' })
    );
  });

  it('fails the optimize run when the model cannot be loaded', async () => {
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockRejectedValue(new Error('connector gone')),
    });

    await expect(runWithModels({})).rejects.toThrow('connector gone');
    expect(optimizeMemory).not.toHaveBeenCalled();
  });

  it('passes every tool call of the round to the optimizer', async () => {
    const toolCalls = [
      { tool_id: 'platform.streams.investigation_progress_report', params: { step: 'triage' } },
      { tool_id: 'nightshift_sandbox_bash', params: { command: 'esql "FROM logs-*"' } },
    ];
    await runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls,
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      interactionId: 'execution-1',
    });

    expect(optimizeMemory).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  it('builds the investigation from the hook tool results when the round has no ids', async () => {
    await runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: [
        {
          tool_id: 'nightshift_sandbox_bash',
          tool_call_id: 'tc-1',
          params: { command: 'esql' },
          results: [{ type: 'other', data: { stdout: 'pool exhausted' } }],
        },
      ],
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      interactionId: 'execution-1',
    });

    expect(optimizeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        investigation: [
          expect.objectContaining({
            kind: 'tool',
            toolId: 'nightshift_sandbox_bash',
            resultText: 'pool exhausted',
          }),
        ],
      })
    );
  });

  it('hands the optimizer the round steps it read from the conversation', async () => {
    const get = jest.fn().mockResolvedValue({
      rounds: [
        {
          id: 'round-1',
          steps: [
            {
              type: 'tool_call',
              tool_id: 'nightshift_sandbox_bash',
              params: { command: 'ls' },
              results: [{ type: 'other', data: { stdout: 'a b' } }],
            },
          ],
        },
      ],
    });
    getAgentBuilder.mockReturnValue({
      runtime: { createModelProvider },
      conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
    });

    await runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: [],
      conversationId: 'conversation-1',
      roundId: 'round-1',
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      interactionId: 'execution-1',
    });

    expect(get).toHaveBeenCalledWith('conversation-1');
    expect(optimizeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        investigation: [
          expect.objectContaining({
            kind: 'tool',
            toolId: 'nightshift_sandbox_bash',
            resultText: 'a b',
          }),
        ],
      })
    );
  });
});

describe('loadRoundSteps', () => {
  const request = { headers: {} } as never;
  const agentBuilderWith = (get: jest.Mock) =>
    ({ conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) } }) as never;

  it('does not read anything without a conversation and round id', async () => {
    const get = jest.fn();
    for (const ids of [{}, { conversationId: 'c' }, { roundId: 'r' }]) {
      expect(
        await loadRoundSteps({
          agentBuilder: agentBuilderWith(get),
          request,
          logger: loggerMock.create(),
          retryDelaysMs: [],
          ...ids,
        })
      ).toBeUndefined();
    }
    expect(get).not.toHaveBeenCalled();
  });

  it('never falls back to another round when the round is missing', async () => {
    const logger = loggerMock.create();
    const get = jest.fn().mockResolvedValue({ rounds: [{ id: 'other', steps: [] }] });
    expect(
      await loadRoundSteps({
        agentBuilder: agentBuilderWith(get),
        request,
        conversationId: 'c',
        roundId: 'r',
        logger,
        retryDelaysMs: [],
      })
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('falls back quietly, without leaking the error, when the read fails', async () => {
    const logger = loggerMock.create();
    const get = jest.fn().mockRejectedValue(new Error('secret-detail'));
    expect(
      await loadRoundSteps({
        agentBuilder: agentBuilderWith(get),
        request,
        conversationId: 'c',
        roundId: 'r',
        logger,
        retryDelaysMs: [],
      })
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.not.stringContaining('secret-detail'));
  });

  it('waits for a round that is saved after the hook fires', async () => {
    const logger = loggerMock.create();
    const get = jest
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ rounds: [{ id: 'other', steps: [] }] })
      .mockResolvedValue({
        rounds: [{ id: 'r', steps: [{ type: 'reasoning', reasoning: 'plan' }] }],
      });
    expect(
      await loadRoundSteps({
        agentBuilder: agentBuilderWith(get),
        request,
        conversationId: 'c',
        roundId: 'r',
        logger,
        retryDelaysMs: [0, 0, 0],
      })
    ).toEqual([{ kind: 'reasoning', text: 'plan' }]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stops waiting when the run is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const get = jest.fn().mockRejectedValue(new Error('not found'));
    expect(
      await loadRoundSteps({
        agentBuilder: agentBuilderWith(get),
        request,
        conversationId: 'c',
        roundId: 'r',
        logger: loggerMock.create(),
        signal: controller.signal,
        retryDelaysMs: [60_000, 60_000],
      })
    ).toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('is unavailable when Agent Builder is not there', async () => {
    expect(
      await loadRoundSteps({
        agentBuilder: undefined,
        request,
        conversationId: 'c',
        roundId: 'r',
        logger: loggerMock.create(),
      })
    ).toBeUndefined();
  });
});
