/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from '../../agent_builder/skills/ki_query_generation';
import {
  buildKIQueryGenerationInput,
  collectGeneratedKIQueries,
  type BuildKIQueryGenerationInputDependencies,
} from './ki_queries_generation_service';

const source = {
  id: 'source-1',
  slug: 'checkout',
  title: 'Checkout',
  view_name: '$.nightshift.sources.default.checkout',
} as NightshiftSource;

describe('buildKIQueryGenerationInput', () => {
  const makeDeps = (
    overrides: Partial<BuildKIQueryGenerationInputDependencies> = {}
  ): BuildKIQueryGenerationInputDependencies => ({
    kiClient: {
      getSourceToQueryLinksMap: jest.fn().mockResolvedValue({
        'source-1': [
          {
            query: {
              id: 'query-1',
              title: 'Error rate',
              type: 'stats',
              severity_score: 65,
              description: 'Tracks error rate',
              esql: { query: 'FROM $.nightshift.sources.default.checkout | STATS COUNT(*)' },
            },
          },
        ],
      }),
    } as unknown as BuildKIQueryGenerationInputDependencies['kiClient'],
    resolveModel: jest.fn(async (connectorId?: string) => connectorId ?? 'default-connector'),
    logger: loggerMock.create(),
    ...overrides,
  });

  it('returns the canonical connector and a message carrying the existing queries', async () => {
    const resolveModel = jest.fn().mockResolvedValue('canonical-connector');

    const { connectorId, message } = await buildKIQueryGenerationInput(
      { source, connectorId: 'connector-alias', maxExistingQueriesForContext: 10 },
      makeDeps({ resolveModel })
    );

    expect(resolveModel).toHaveBeenCalledWith('connector-alias');
    expect(connectorId).toBe('canonical-connector');
    expect(message).toContain('Error rate');
  });
});

describe('collectGeneratedKIQueries', () => {
  it('returns the finalized queries and reports telemetry with the agent round duration', () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;
    const agentConversation = {
      rounds: [
        {
          time_to_last_token: 4200,
          model_usage: { input_tokens: 10, output_tokens: 20 },
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
              tool_call_id: 'validate-1',
              params: {},
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    slug: 'checkout',
                    finalized: true,
                    finalized_queries: [
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
                  },
                },
              ],
            },
          ],
        },
      ],
    } as unknown as Pick<Conversation, 'rounds'>;

    const result = collectGeneratedKIQueries(
      { source, connectorId: 'test-connector', agentConversation },
      { logger: loggerMock.create(), telemetry }
    );

    expect(result.connectorId).toBe('test-connector');
    expect(result.queries).toHaveLength(1);
    expect(telemetry.trackSignificantEventsQueriesGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        connector_id: 'test-connector',
        source_id: 'source-1',
        input_tokens_used: 10,
        output_tokens_used: 20,
        duration_ms: 4200,
      })
    );
  });

  it('reports an agent run that never finalized without telemetry, so the workflow can retry', () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    const result = collectGeneratedKIQueries(
      {
        source,
        connectorId: 'test-connector',
        agentConversation: {
          rounds: [{ steps: [], model_usage: { input_tokens: 30, output_tokens: 12 } }],
        } as unknown as Pick<Conversation, 'rounds'>,
      },
      { logger: loggerMock.create(), telemetry }
    );

    // The workflow sums every attempt, so a wasted one still reports what it spent.
    expect(result).toEqual({
      finalized: false,
      queries: [],
      connectorId: 'test-connector',
      tokensUsed: { prompt: 30, completion: 12, total: 42, cached: 0 },
    });
    expect(telemetry.trackSignificantEventsQueriesGenerated).not.toHaveBeenCalled();
  });
});
