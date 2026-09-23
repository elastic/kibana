/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceClient } from '@kbn/inference-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import {
  generateKIQueries,
  type GenerateKIQueriesDependencies,
} from './ki_queries_generation_service';
import { identifyKIQueries } from './identify_ki_queries';
import { isSignificantEventsFeatureFlagEnabled } from '../feature_flags/is_significant_events_feature_flag_enabled';
jest.mock('./identify_ki_queries', () => ({
  identifyKIQueries: jest.fn(),
}));
jest.mock('../feature_flags/is_significant_events_feature_flag_enabled', () => ({
  isSignificantEventsFeatureFlagEnabled: jest.fn().mockResolvedValue(false),
}));
jest.mock(
  '../semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled',
  () => ({
    isSignificantEventsSemanticCodeSearchGroundingEnabled: jest.fn().mockResolvedValue(false),
  })
);

const identifyKIQueriesMock = identifyKIQueries as jest.MockedFunction<typeof identifyKIQueries>;
const isSignificantEventsFeatureFlagEnabledMock = jest.mocked(
  isSignificantEventsFeatureFlagEnabled
);

const source = {
  id: 'source-1',
  title: 'Checkout',
  view_name: '$.nightshift.sources.default.checkout',
} as NightshiftSource;

const makeDeps = (
  overrides: Partial<GenerateKIQueriesDependencies> = {}
): GenerateKIQueriesDependencies => ({
  inferenceClient: {} as InferenceClient,
  kiClient: {} as never,
  esClient: {} as never,
  streamDataEsClient: {} as never,
  featureFlags: {} as never,
  searchInferenceEndpoints: undefined,
  request: {} as GenerateKIQueriesDependencies['request'],
  logger: loggerMock.create(),
  signal: new AbortController().signal,
  telemetry: {
    trackSignificantEventsQueriesGenerated: jest.fn(),
  } as unknown as EbtTelemetryClient,
  agentBuilderTools: undefined,
  ...overrides,
});

const toolUsage = {
  get_stream_features: { calls: 1, failures: 0, latency_ms: 10 },
  add_queries: { calls: 1, failures: 0, latency_ms: 20 },
};

describe('generateKIQueries', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
    identifyKIQueriesMock.mockReset();
    isSignificantEventsFeatureFlagEnabledMock.mockResolvedValue(false);
    identifyKIQueriesMock.mockResolvedValue({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
      toolUsage,
      reasoningDiagnostics: { externalContentToolContinuations: 4 },
    });
  });

  it('reports the external_content_tool_continuations counter to telemetry', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    await generateKIQueries(
      { source, connectorId: 'test-connector' },
      makeDeps({ telemetry, logger })
    );

    expect(telemetry.trackSignificantEventsQueriesGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        connector_id: 'test-connector',
        external_content_tool_continuations: 4,
      })
    );
  });

  it('returns only queries, tokensUsed, and connectorId', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    const result = await generateKIQueries(
      { source, connectorId: 'test-connector' },
      makeDeps({ telemetry, logger })
    );

    expect(result).toEqual({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
      connectorId: 'test-connector',
    });
    expect(result).not.toHaveProperty('reasoningDiagnostics');
    expect(result).not.toHaveProperty('toolUsage');
  });

  it('forwards maxDurationMs to the query generation wrapper', async () => {
    await generateKIQueries(
      { source, connectorId: 'test-connector', maxDurationMs: 300000 },
      makeDeps({ logger })
    );

    expect(identifyKIQueriesMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ maxDurationMs: 300000, connectorId: 'test-connector' })
    );
  });

  it('does not pass a system prompt', async () => {
    await generateKIQueries({ source, connectorId: 'test-connector' }, makeDeps({ logger }));

    expect(identifyKIQueriesMock.mock.calls[0][0]).not.toHaveProperty('systemPrompt');
  });
});
