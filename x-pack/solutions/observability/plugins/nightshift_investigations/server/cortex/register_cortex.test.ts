/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { createInferenceRequestError } from '@kbn/inference-common';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  NightshiftModelNotFoundError,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
  NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { hydrateCortexWorkspace, runCortexOptimize } from './register_cortex';
import { optimizeCortex } from './optimize';
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
  const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
  const getClient = jest.fn((options: { bindTo?: unknown }) =>
    options.bindTo ? {} : { getConnectorById }
  );
  const getDefaultConnector = jest.fn();
  const getInference = jest
    .fn()
    .mockReturnValue({ getClient, getConnectorById, getDefaultConnector });
  const getSetting = jest.fn().mockResolvedValue(false);
  const getSavedObjects = jest.fn().mockReturnValue({
    getScopedClient: jest.fn().mockReturnValue({}),
  });
  const getUiSettings = jest.fn().mockReturnValue({
    asScopedToClient: jest.fn().mockReturnValue({ get: getSetting }),
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

  const run = ({
    agentId,
    requestedConnectorId,
    roundConnectorId,
    calls = toolCalls,
  }: {
    agentId?: string;
    requestedConnectorId?: string;
    roundConnectorId?: string;
    calls?: InvestigationToolCall[];
  } = {}) =>
    runCortexOptimize({
      request,
      agentId,
      userMessage: 'why?',
      assistantMessage: 'redis',
      toolCalls: calls,
      esClient,
      spaceId: 'default',
      interactionId: 'execution-1',
      analytics: coreMock.createSetup().analytics,
      requestedConnectorId,
      roundConnectorId,
      getInference,
      getSavedObjects,
      getUiSettings,
      logger: loggerMock.create(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    getSetting.mockResolvedValue(false);
    getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
  });

  it('runs for the Nightshift investigation agent', async () => {
    await run({ agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID });
    expect(optimizeCortex).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  // A reply that made almost no tool calls answered from what the wiki already said, or was a
  // smoke test. Neither should mint pages.
  it('skips a round with fewer than three tool calls', async () => {
    await run({ agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID, calls: toolCalls.slice(0, 2) });
    expect(optimizeCortex).not.toHaveBeenCalled();
    expect(getInference).not.toHaveBeenCalled();
  });

  it('attributes the optimize LLM call to significant events investigation spend', async () => {
    await run({
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      requestedConnectorId: 'connector-1',
    });
    expect(getClient).toHaveBeenCalledWith({
      request,
      bindTo: {
        connectorId: 'connector-1',
        metadata: {
          connectorTelemetry: {
            pluginId: NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
            aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
            productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
            productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
            interactionId: 'execution-1',
          },
        },
      },
    });
  });

  it('treats connector_id as a strict override', async () => {
    getConnectorById.mockRejectedValue(createInferenceRequestError('not found', 404));

    await expect(
      run({
        agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
        requestedConnectorId: 'missing-model',
      })
    ).rejects.toEqual(new NightshiftModelNotFoundError('missing-model'));
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('falls back from a missing round_connector_id to the investigation default', async () => {
    getConnectorById.mockImplementation(async (connectorId: string) => {
      if (connectorId === 'removed-round-model') {
        throw createInferenceRequestError('not found', 404);
      }
      return { connectorId };
    });

    await run({
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      roundConnectorId: 'removed-round-model',
    });

    expect(getConnectorById.mock.calls).toEqual([
      ['removed-round-model', request],
      [NIGHTSHIFT_DEFAULT_MODELS.investigation, request],
    ]);
    expect(getClient).toHaveBeenCalledWith(
      expect.objectContaining({
        bindTo: expect.objectContaining({
          connectorId: NIGHTSHIFT_DEFAULT_MODELS.investigation,
        }),
      })
    );
  });

  it('passes only sandbox tool calls to the optimizer', async () => {
    await run({
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      calls: [progressReport, ...toolCalls, progressReport],
    });
    expect(optimizeCortex).toHaveBeenCalledWith(expect.objectContaining({ toolCalls }));
  });

  it('does not count non-sandbox tool calls towards the minimum', async () => {
    await run({
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      calls: [...toolCalls.slice(0, 2), progressReport, progressReport],
    });
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('skips another agent', async () => {
    await run({ agentId: 'other-agent' });
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  // The optimize workflow has a manual trigger, so it can be invoked without an agent id. Writing
  // to the wiki on behalf of an unidentified caller is worse than not writing at all.
  it('skips a round with no agent_id rather than trusting it', async () => {
    await run();
    await run({ agentId: '' });
    expect(optimizeCortex).not.toHaveBeenCalled();
  });

  it('skips a different agent', async () => {
    await run({ agentId: 'some-other-agent' });
    expect(optimizeCortex).not.toHaveBeenCalled();
  });
});
