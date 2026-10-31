/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { runCortexOptimize } from '../cortex/register_cortex';
import { optimizeCortex } from '../cortex/optimize';
import { runMemoryOptimize } from '../memory/register_memory';
import { optimizeMemory } from '../memory/optimize';
import { withToolResults } from '../step_definitions/cortex_optimize';
import { INVESTIGATOR_ROUNDS } from './__fixtures__/investigator_rounds';

// Pins the exact input the Cortex and memory optimizers receive for investigator rounds, from the
// workflow step's tool calls through each optimizer's own filtering. Refactors of that shaping
// must leave these snapshots unchanged; update them only for an intended behavior change.

jest.mock('@kbn/nightshift-ai', () => ({
  ...jest.requireActual('@kbn/nightshift-ai'),
  resolveNightshiftModelForRequest: jest.fn(async () => 'nightshift-default'),
}));

jest.mock('../cortex/optimize', () => ({
  createLlmProposeCortexEdits: jest.fn(() => jest.fn()),
  optimizeCortex: jest.fn(),
}));

jest.mock('../cortex/page_store', () => ({
  createCortexPageStore: jest.fn(() => ({})),
}));

jest.mock('../memory/optimize', () => ({
  createLlmProposeMemoryExtractions: jest.fn(() => jest.fn()),
  createLlmProposeMemoryLabels: jest.fn(() => jest.fn()),
  createLlmSynthesizeMemoryGroup: jest.fn(() => jest.fn()),
  optimizeMemory: jest.fn(),
}));

describe('optimizer input for investigator rounds', () => {
  const request = { headers: {} } as never;
  const createModelProvider = jest.fn();
  const getInference = jest.fn().mockReturnValue({});
  const getSavedObjects = jest.fn().mockReturnValue({});
  const getUiSettings = jest.fn().mockReturnValue({});

  const agentBuilderFor = (steps?: Array<Record<string, unknown>>) => () => ({
    runtime: { createModelProvider },
    conversations: {
      getScopedClient: jest.fn(async () => ({
        get: jest.fn(async () => ({ rounds: steps ? [{ id: 'round-1', steps }] : [] })),
      })),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockResolvedValue({
        inferenceClient: { output: jest.fn() },
        connector: { connectorId: 'connector-1' },
      }),
    });
  });

  describe.each(INVESTIGATOR_ROUNDS)('$name', (round) => {
    const toolCalls = () => withToolResults(round.toolCalls, round.toolResults);

    it('gives the Cortex optimizer the same input', async () => {
      await runCortexOptimize({
        request,
        agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
        userMessage: round.prompt,
        assistantMessage: round.response,
        toolCalls: toolCalls(),
        esClient: {} as never,
        spaceId: 'default',
        interactionId: 'execution-1',
        analytics: coreMock.createSetup().analytics,
        conversationId: 'conversation-1',
        roundId: 'round-1',
        getAgentBuilder: agentBuilderFor() as never,
        getInference,
        getSavedObjects,
        getUiSettings,
        logger: loggerMock.create(),
      });

      const [input] = jest.mocked(optimizeCortex).mock.calls[0];
      expect({
        userMessage: input.userMessage,
        assistantMessage: input.assistantMessage,
        toolCalls: input.toolCalls,
      }).toMatchSnapshot();
    });

    // Without a conversation id the step cannot read the round back, so it falls back to the
    // hook's tool calls; that is the path a replay without saved rounds takes.
    it.each([
      ['the persisted round', 'conversation-1'],
      ['the hook tool calls when the round cannot be read', undefined],
    ])('gives the memory optimizer the same input from %s', async (_label, conversationId) => {
      await runMemoryOptimize({
        request,
        agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
        userMessage: round.prompt,
        assistantMessage: round.response,
        toolCalls: toolCalls(),
        conversationId,
        roundId: 'round-1',
        recalledIds: ['memory_redis-cart-cache'],
        esClient: {} as never,
        spaceId: 'default',
        getAgentBuilder: agentBuilderFor(round.steps) as never,
        getInference,
        getSavedObjects,
        getUiSettings,
        logger: loggerMock.create(),
        interactionId: 'execution-1',
      });

      const [input] = jest.mocked(optimizeMemory).mock.calls[0];
      expect({
        userMessage: input.userMessage,
        assistantMessage: input.assistantMessage,
        recalledIds: input.recalledIds,
        toolCalls: input.toolCalls,
        investigation: input.investigation,
      }).toMatchSnapshot();
    });
  });
});
