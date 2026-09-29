/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE } from '../telemetry';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { hydrateCortexWorkspace, runCortexOptimize } from './register_cortex';
import { createLlmProposeCortexEdits, optimizeCortex } from './optimize';
import { materializeCortex } from './materialize';

jest.mock('./optimize', () => ({
  createLlmProposeCortexEdits: jest.fn(() => jest.fn()),
  optimizeCortex: jest.fn(),
}));

jest.mock('./page_store', () => ({
  createCortexPageStore: jest.fn(() => ({})),
}));

jest.mock('./materialize', () => ({
  materializeCortex: jest.fn(),
}));

const unavailable = () =>
  Object.assign(new Error('14 UNAVAILABLE: connect: connection refused'), { code: 14 });

describe('hydrateCortexWorkspace', () => {
  const materialize = materializeCortex as jest.MockedFunction<typeof materializeCortex>;

  const hydrate = (signal?: AbortSignal) =>
    hydrateCortexWorkspace({
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

describe('runCortexOptimize', () => {
  const esClient = { search: jest.fn() } as never;
  const request = { headers: {} } as never;
  const analytics = coreMock.createSetup().analytics;
  const inferenceClient = { output: jest.fn() };
  const createModelProvider = jest.fn();
  const getAgentBuilder = jest.fn().mockReturnValue({
    runtime: { createModelProvider },
  });

  const toolCalls: InvestigationToolCall[] = [
    { tool_id: 'nightshift_sandbox_bash', params: { command: 'cat /workspace/cortex/README.md' } },
    { tool_id: 'nightshift_sandbox_bash', params: { command: 'esql "FROM logs-* | LIMIT 5"' } },
    { tool_id: 'nightshift_sandbox_view_file', params: { file_path: '/workspace/elastic.md' } },
  ];
  const progressReport: InvestigationToolCall = {
    tool_id: 'platform.streams.investigation_progress_report',
    params: { step: 'triage' },
  };

  const run = (
    agentId?: string,
    { calls = toolCalls, connectorId }: { calls?: InvestigationToolCall[]; connectorId?: string } = {}
  ) =>
    runCortexOptimize({
      request,
      agentId,
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: calls,
      esClient,
      spaceId: 'default',
      interactionId: 'execution-1',
      analytics,
      conversationId: 'conversation-1',
      roundId: 'round-1',
      getAgentBuilder,
      logger: loggerMock.create(),
      connectorId,
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
  });

  it('runs for the Nightshift investigation agent', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    expect(optimizeCortex).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  // A reply that made almost no tool calls answered from what the wiki already said, or was a
  // smoke test. Neither should mint pages.
  it('skips a round with fewer than three tool calls', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { calls: toolCalls.slice(0, 2) });
    expect(optimizeCortex).not.toHaveBeenCalled();
    expect(createModelProvider).not.toHaveBeenCalled();
  });

  it('attributes inherited connector calls to the Nightshift investigation feature', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { connectorId: 'anthropic-sonnet' });
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
    expect(optimizeCortex).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetry: expect.objectContaining({
          reportEditsApplied: expect.any(Function),
        }),
      })
    );
  });

  it('reports applied Cortex edits with the completed round identifiers', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { connectorId: 'anthropic-sonnet' });
    const call = jest.mocked(optimizeCortex).mock.calls[0]?.[0];
    if (!call) {
      throw new Error('Cortex optimizer was not invoked');
    }
    call.telemetry.reportEditsApplied([{ action: 'upsert', entityType: 'service' }]);
    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE, {
      conversation_id: 'conversation-1',
      round_id: 'round-1',
      action: 'upsert',
      entity_type: 'service',
      edit_count: 1,
    });
  });

  it('passes only sandbox tool calls to the optimizer', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: [progressReport, ...toolCalls, progressReport],
    });
    expect(optimizeCortex).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  it('does not count non-sandbox tool calls towards the minimum', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, {
      calls: [...toolCalls.slice(0, 2), progressReport, progressReport],
    });
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  // The optimize workflow has a manual trigger, so it can be invoked without an agent id. Writing
  // to the wiki on behalf of an unidentified caller is worse than not writing at all.
  it('skips a round with no agent_id rather than trusting it', async () => {
    await run(undefined);
    await run('');
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('skips a different agent', async () => {
    await run('some-other-agent');
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('inherits the triggering agent connector via createModelProvider', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID, { connectorId: 'anthropic-sonnet' });

    expect(createModelProvider).toHaveBeenCalledWith(
      expect.objectContaining({ request, defaultConnectorId: 'anthropic-sonnet' })
    );
    expect(createLlmProposeCortexEdits).toHaveBeenCalledWith({ inferenceClient });
    expect(optimizeCortex).toHaveBeenCalled();
  });
});
