/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import {
  generateKIQueries,
  type GenerateKIQueriesDependencies,
} from './ki_queries_generation_service';
import { executeKIQueryGenerationAgent } from './identify_ki_queries_via_agent';

jest.mock('./identify_ki_queries_via_agent', () => ({
  executeKIQueryGenerationAgent: jest.fn(),
}));

const executeKIQueryGenerationAgentMock = executeKIQueryGenerationAgent as jest.MockedFunction<
  typeof executeKIQueryGenerationAgent
>;

const source = {
  id: 'source-1',
  slug: 'checkout',
  title: 'Checkout',
  view_name: '$.nightshift.sources.default.checkout',
} as NightshiftSource;

const makeDeps = (
  overrides: Partial<GenerateKIQueriesDependencies> = {}
): GenerateKIQueriesDependencies => ({
  kiClient: {
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({
      'source-1': [
        {
          query: {
            id: 'query-1',
            title: 'Error rate',
            type: 'stats',
            severity_score: 65,
            description: 'Tracks error rate',
            esql: {
              query:
                'FROM $.nightshift.sources.default.checkout | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
            },
          },
        },
      ],
    }),
  } as unknown as GenerateKIQueriesDependencies['kiClient'],
  agentBuilder: {} as AgentBuilderPluginStart,
  resolveModel: jest.fn(async (connectorId?: string) => connectorId ?? 'default-connector'),
  request: {} as GenerateKIQueriesDependencies['request'],
  logger: loggerMock.create(),
  signal: new AbortController().signal,
  telemetry: {
    trackSignificantEventsQueriesGenerated: jest.fn(),
  } as unknown as EbtTelemetryClient,
  ...overrides,
});

describe('generateKIQueries', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
    executeKIQueryGenerationAgentMock.mockReset();
    executeKIQueryGenerationAgentMock.mockResolvedValue({
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
    });
  });

  it('returns generated queries and reports telemetry', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    const result = await generateKIQueries(
      { source, connectorId: 'test-connector', runId: 'run-1' },
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
    expect(executeKIQueryGenerationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'run-1',
        source,
        existingQueries: [
          {
            id: 'query-1',
            title: 'Error rate',
            type: 'stats',
            severity_score: 65,
            description: 'Tracks error rate',
            esql: 'FROM $.nightshift.sources.default.checkout | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
          },
        ],
      })
    );
    expect(telemetry.trackSignificantEventsQueriesGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        connector_id: 'test-connector',
        source_id: 'source-1',
        input_tokens_used: 10,
        output_tokens_used: 20,
      })
    );
  });

  it('uses the canonical connector returned by model resolution', async () => {
    const resolveModel = jest.fn().mockResolvedValue('canonical-connector');

    await generateKIQueries(
      { source, connectorId: 'connector-alias', runId: 'run-1' },
      makeDeps({ resolveModel, logger })
    );

    expect(resolveModel).toHaveBeenCalledWith('connector-alias');
    expect(executeKIQueryGenerationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'canonical-connector' })
    );
  });
});
