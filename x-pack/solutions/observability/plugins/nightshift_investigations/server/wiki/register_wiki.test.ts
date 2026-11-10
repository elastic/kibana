/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import {
  NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
} from '@kbn/nightshift-shared';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE } from '../telemetry';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { buildAlertRecoveredFollowUpMessage } from '../client/build_investigation_message';
import { hydrateWikiWorkspace, runWikiOptimize } from './register_wiki';
import { createLlmProposeWikiEdits, optimizeWiki } from './optimize';
import { materializeWiki } from './materialize';

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
  createLlmProposeWikiEdits: jest.fn(() => jest.fn()),
  optimizeWiki: jest.fn(),
}));

jest.mock('./page_store', () => ({
  createWikiPageStore: jest.fn(() => ({})),
}));

jest.mock('./materialize', () => ({
  materializeWiki: jest.fn(),
}));

const unavailable = () =>
  Object.assign(new Error('14 UNAVAILABLE: connect: connection refused'), { code: 14 });

describe('hydrateWikiWorkspace', () => {
  const materialize = materializeWiki as jest.MockedFunction<typeof materializeWiki>;

  const hydrate = (signal?: AbortSignal) =>
    hydrateWikiWorkspace({
      session: {} as never,
      esClient: {} as never,
      spaceId: 'default',
      signal,
      analytics: coreMock.createSetup().analytics,
      conversationId: 'conv-1',
      logger: loggerMock.create(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('materializes once when the sandbox accepts the writes', async () => {
    materialize.mockResolvedValueOnce(undefined);

    await hydrate();

    expect(materialize).toHaveBeenCalledTimes(1);
  });

  // The first call to a freshly allocated pod can be refused before the pod listens. The sandbox
  // moves the conversation to a new pod on UNAVAILABLE, so the retry is what gets the wiki written.
  it('retries once when the sandbox is unavailable', async () => {
    materialize.mockRejectedValueOnce(unavailable()).mockResolvedValueOnce(undefined);

    await hydrate();

    expect(materialize).toHaveBeenCalledTimes(2);
  });

  it('gives up after a single retry', async () => {
    materialize.mockRejectedValue(unavailable());

    await expect(hydrate()).rejects.toThrow('UNAVAILABLE');
    expect(materialize).toHaveBeenCalledTimes(2);
  });

  it('does not retry other failures', async () => {
    materialize.mockRejectedValueOnce(new Error('index_not_found_exception'));

    await expect(hydrate()).rejects.toThrow('index_not_found_exception');
    expect(materialize).toHaveBeenCalledTimes(1);
  });

  it('does not retry once the hydrate has timed out', async () => {
    const controller = new AbortController();
    materialize.mockImplementationOnce(async () => {
      controller.abort();
      throw unavailable();
    });

    await expect(hydrate(controller.signal)).rejects.toThrow('UNAVAILABLE');
    expect(materialize).toHaveBeenCalledTimes(1);
  });
});

describe('runWikiOptimize', () => {
  const esClient = { search: jest.fn() } as never;
  const request = { headers: {} } as never;
  const analytics = coreMock.createSetup().analytics;
  const inferenceClient = { output: jest.fn() };
  const createModelProvider = jest.fn();
  const getAgentBuilder = jest.fn().mockReturnValue({
    runtime: { createModelProvider },
  });
  const getInference = jest.fn().mockReturnValue({});
  const getSavedObjects = jest.fn().mockReturnValue({});
  const getUiSettings = jest.fn().mockReturnValue({});

  const toolCalls: InvestigationToolCall[] = [
    { tool_id: 'nightshift_sandbox_bash', params: { command: 'cat /workspace/wiki/README.md' } },
    { tool_id: 'nightshift_sandbox_bash', params: { command: 'esql "FROM logs-* | LIMIT 5"' } },
    {
      tool_id: 'nightshift_sandbox_view_file',
      params: { file_path: '/workspace/.connector-docs/elastic.md' },
    },
  ];
  const recordHypotheses: InvestigationToolCall = {
    tool_id: 'agentic_investigations.set_hypotheses',
    params: { hypotheses: [] },
  };

  const run = (
    agentId?: string,
    {
      calls = toolCalls,
      connectorId,
      roundConnectorId,
      userMessage = 'why?',
      roundIndex,
    }: {
      calls?: InvestigationToolCall[];
      connectorId?: string;
      roundConnectorId?: string;
      userMessage?: string;
      roundIndex?: number;
    } = {}
  ) =>
    runWikiOptimize({
      request,
      agentId,
      userMessage,
      assistantMessage: 'redis',
      toolCalls: calls,
      esClient,
      spaceId: 'default',
      interactionId: 'execution-1',
      analytics,
      conversationId: 'conversation-1',
      roundId: 'round-1',
      roundIndex,
      getAgentBuilder,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
      requestedConnectorId: connectorId,
      roundConnectorId,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockResolvedValue({
        inferenceClient,
        connector: { connectorId: 'connector-1' },
      }),
    });
    getAgentBuilder.mockReturnValue({ runtime: { createModelProvider } });
    getInference.mockReturnValue({});
    getSavedObjects.mockReturnValue({});
    getUiSettings.mockReturnValue({});
  });

  it('runs for the Nightshift investigation agent', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    expect(optimizeWiki).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  // A reply that made almost no tool calls answered from what the wiki already said, or was a
  // smoke test. Neither should mint pages.
  it('skips a round with fewer than three tool calls', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { calls: toolCalls.slice(0, 2) });
    expect(optimizeWiki).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('tells the optimizer the first round is an initial investigation', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { roundIndex: 0 });

    expect(optimizeWiki).toHaveBeenCalledWith(expect.objectContaining({ roundKind: 'initial' }));
  });

  // A follow-up is held to a lower bar than an investigation, but a message nobody checked, such as
  // a correction or "thanks", is an unverified claim and teaches the shared wiki nothing.
  it('learns from a follow-up round that made fewer than three tool calls', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: toolCalls.slice(0, 1),
      userMessage: 'You never checked the session cache that checkout depends on.',
      roundIndex: 1,
    });

    expect(optimizeWiki).toHaveBeenCalledWith(
      expect.objectContaining({ roundKind: 'follow_up', toolCalls: toolCalls.slice(0, 1) })
    );
  });

  it('skips a follow-up that made no tool calls, however substantive its message', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: [],
      userMessage: 'Cart uses Redis, not Memcached.',
      roundIndex: 1,
    });

    expect(optimizeWiki).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('treats an alert-recovery message as an ordinary follow-up', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: toolCalls.slice(0, 1),
      userMessage: buildAlertRecoveredFollowUpMessage({
        alertUuid: 'uuid',
        alertId: 'instance',
        ruleId: 'rule',
        ruleName: 'Orders lag',
        ruleTypeId: 'type',
      }),
      roundIndex: 1,
    });

    expect(optimizeWiki).toHaveBeenCalledWith(expect.objectContaining({ roundKind: 'follow_up' }));
  });

  it('gives the optimizer the answer the round followed when the conversation is readable', async () => {
    const conversation = {
      rounds: [
        {
          id: 'round-0',
          started_at: '2026-03-02T09:00:00.000Z',
          input: { message: 'Why is checkout slow?' },
          response: { message: 'The gateway times out.' },
          steps: [],
        },
        {
          id: 'round-1',
          started_at: '2026-03-02T09:30:00.000Z',
          input: { message: 'You missed the cache.' },
          response: { message: 'Confirmed.' },
          steps: [],
        },
      ],
    };
    getAgentBuilder.mockReturnValue({
      runtime: { createModelProvider },
      conversations: {
        getScopedClient: jest
          .fn()
          .mockResolvedValue({ get: jest.fn().mockResolvedValue(conversation) }),
      },
    });

    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      userMessage: 'You missed the cache.',
      roundIndex: 1,
    });

    expect(optimizeWiki).toHaveBeenCalledWith(
      expect.objectContaining({
        roundKind: 'follow_up',
        previousUserMessage: 'Why is checkout slow?',
        previousAssistantMessage: 'The gateway times out.',
      })
    );
  });

  it('skips a round in a conversation the caller cannot read, without writing anything', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(createConversationNotFoundError({ conversationId: 'conversation-1' }));
    getAgentBuilder.mockReturnValue({
      runtime: { createModelProvider },
      conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
    });

    await expect(run(NIGHTSHIFT_INVESTIGATION_AGENT_ID)).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
    expect(optimizeWiki).not.toHaveBeenCalled();
  });

  it('attributes inherited connector calls to the Nightshift investigation feature', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { roundConnectorId: 'anthropic-sonnet' });
    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'anthropic-sonnet',
      telemetryMetadata: {
        pluginId: NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
        aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
        productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
        productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
        interactionId: 'execution-1',
      },
    });
    expect(optimizeWiki).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetry: expect.objectContaining({
          reportEditsApplied: expect.any(Function),
        }),
      })
    );
  });

  it('reports applied Wiki edits with the completed round identifiers', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { roundConnectorId: 'anthropic-sonnet' });
    const call = jest.mocked(optimizeWiki).mock.calls[0]?.[0];
    if (!call) {
      throw new Error('Wiki optimizer was not invoked');
    }
    call.telemetry.reportEditsApplied([{ action: 'upsert', entityType: 'service' }]);
    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE, {
      conversation_id: 'conversation-1',
      round_id: 'round-1',
      action: 'upsert',
      entity_type: 'service',
      edit_count: 1,
    });
  });

  it('passes only sandbox tool calls to the optimizer', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: [recordHypotheses, ...toolCalls, recordHypotheses],
    });
    expect(optimizeWiki).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  it('does not count non-sandbox tool calls towards the minimum', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: [...toolCalls.slice(0, 2), recordHypotheses, recordHypotheses],
    });
    expect(optimizeWiki).not.toHaveBeenCalled();
  });

  // The optimize workflow has a manual trigger, so it can be invoked without an agent id. Writing
  // to the wiki on behalf of an unidentified caller is worse than not writing at all.
  it('skips a round with no agent_id rather than trusting it', async () => {
    await run(undefined);
    await run('');
    expect(optimizeWiki).not.toHaveBeenCalled();
  });

  it('skips a different agent', async () => {
    await run('some-other-agent');
    expect(optimizeWiki).not.toHaveBeenCalled();
  });

  it('treats connector_id as a strict override over the round model', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      connectorId: 'manual-model',
      roundConnectorId: 'round-model',
    });

    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ defaultConnectorId: 'manual-model' })
    );
  });

  it('uses the Nightshift default when no model is passed', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);

    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ defaultConnectorId: 'nightshift-default' })
    );
  });

  it('fails the optimize run when the model cannot be loaded', async () => {
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockRejectedValue(new Error('connector gone')),
    });

    await expect(run(NIGHTSHIFT_INVESTIGATION_AGENT_ID)).rejects.toThrow('connector gone');
    expect(optimizeWiki).not.toHaveBeenCalled();
  });

  it('inherits the triggering agent connector via createModelProvider', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { roundConnectorId: 'anthropic-sonnet' });

    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ request, defaultConnectorId: 'anthropic-sonnet' })
    );
    expect(createLlmProposeWikiEdits).toHaveBeenCalledWith({ inferenceClient });
    expect(optimizeWiki).toHaveBeenCalled();
  });
});
