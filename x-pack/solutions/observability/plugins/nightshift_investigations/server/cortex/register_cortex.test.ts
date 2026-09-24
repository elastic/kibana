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
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
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
  const getClient = jest.fn().mockReturnValue({});
  const getInference = jest.fn().mockReturnValue({ getClient });
  const getSearchInferenceEndpoints = jest.fn().mockReturnValue({
    endpoints: {
      getForFeature: jest.fn().mockResolvedValue({
        endpoints: [{ connectorId: 'connector-1' }],
      }),
    },
  });

  const run = (agentId?: string) =>
    runCortexOptimize({
      request,
      agentId,
      userMessage: 'why?',
      assistantMessage: 'redis',
      esClient,
      spaceId: 'default',
      analytics: coreMock.createSetup().analytics,
      getInference,
      getSearchInferenceEndpoints,
      logger: loggerMock.create(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs for the Nightshift investigation agent', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    expect(optimizeCortex).toHaveBeenCalled();
  });

  it('attributes the optimize LLM call to significant events investigation spend', async () => {
    await run(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    expect(getClient).toHaveBeenCalledWith({
      request,
      bindTo: {
        connectorId: 'connector-1',
        metadata: {
          connectorTelemetry: {
            pluginId: SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
            aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
          },
        },
      },
    });
  });

  it('skips another agent', async () => {
    await run('other-agent');
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
});
