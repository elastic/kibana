/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { Streams } from '@kbn/streams-schema';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from '../../agent_builder/skills/ki_query_generation';
import {
  buildKIQueryGenerationUserMessage,
  executeKIQueryGenerationAgent,
  MAX_EXISTING_QUERIES_FOR_CONTEXT,
} from './identify_ki_queries_via_agent';

const definition: Streams.WiredStream.Definition = {
  name: 'logs.test',
  description: 'Test logs',
  updated_at: new Date().toISOString(),
  type: 'wired',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    failure_store: { inherit: {} },
    wired: { fields: {}, routing: [] },
  },
};

describe('executeKIQueryGenerationAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns finalized queries from the latest validation result', async () => {
    const validatedQuery = {
      type: 'match' as const,
      title: 'Validated query',
      description: 'Detects validated failures',
      esql: { query: 'FROM logs.test | WHERE message:"failure"' },
      category: 'error' as const,
      severity_score: 60,
      features: [{ id: 'feature-1', run_id: 'run-1' }],
    };
    const executeAgent = jest.fn().mockResolvedValue({
      events$: of(
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
            tool_call_id: 'validate-1',
            results: [
              {
                type: ToolResultType.other,
                data: {
                  target_id: 'logs.other',
                  finalized: true,
                  finalized_queries: [
                    { ...validatedQuery, esql: { query: 'FROM superseded-validation' } },
                  ],
                },
              },
            ],
          },
        },
        {
          type: ChatEventType.toolResult,
          data: {
            tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
            tool_call_id: 'validate-2',
            results: [
              {
                type: ToolResultType.other,
                data: {
                  target_id: 'logs.test',
                  finalized: true,
                  finalized_queries: [validatedQuery],
                },
              },
            ],
          },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              model_usage: {
                input_tokens: 10,
                output_tokens: 5,
                cached_input_tokens: 2,
              },
            },
          },
        }
      ),
    });
    const request = {} as KibanaRequest;
    const agentBuilder = {
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({
          create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
        }),
      },
      execution: { executeAgent },
    } as unknown as AgentBuilderPluginStart;
    const requestSignal = new AbortController().signal;
    const timeoutSignal = new AbortController().signal;
    const executionSignal = new AbortController().signal;
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    const anySpy = jest.spyOn(AbortSignal, 'any').mockReturnValue(executionSignal);

    await expect(
      executeKIQueryGenerationAgent({
        agentBuilder,
        request,
        connectorId: 'connector-1',
        interactionId: 'run-1',
        definition,
        existingQueries: [],
        signal: requestSignal,
        logger: loggerMock.create(),
      })
    ).resolves.toEqual({
      queries: [
        {
          type: 'match',
          title: 'Validated query',
          description: 'Detects validated failures',
          esql: { query: 'FROM logs.test | WHERE message:"failure"' },
          severity_score: 60,
          evidence: undefined,
          replaces: undefined,
          features: [{ id: 'feature-1', run_id: 'run-1' }],
        },
      ],
      tokensUsed: {
        prompt: 10,
        completion: 5,
        total: 15,
        cached: 2,
      },
    });

    expect(timeoutSpy).toHaveBeenCalledWith(300_000);
    expect(anySpy).toHaveBeenCalledWith([requestSignal, timeoutSignal]);
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: executionSignal,
        params: expect.objectContaining({
          telemetryMetadata: {
            pluginId: 'significant_events_ki_query_generation',
            aggregateBy: 'significant_events',
            productSolution: 'observability',
            productFeature: 'nightshift',
            interactionId: 'run-1',
          },
        }),
      })
    );
  });

  it('rejects queries finalized for a different target', async () => {
    const executeAgent = jest.fn().mockResolvedValue({
      events$: of({
        type: ChatEventType.toolResult,
        data: {
          tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
          tool_call_id: 'validate-1',
          results: [
            {
              type: ToolResultType.other,
              data: {
                target_id: 'logs.other',
                finalized: true,
                finalized_queries: [],
              },
            },
          ],
        },
      }),
    });
    const agentBuilder = {
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({
          create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
        }),
      },
      execution: { executeAgent },
    } as unknown as AgentBuilderPluginStart;

    await expect(
      executeKIQueryGenerationAgent({
        agentBuilder,
        request: {} as KibanaRequest,
        connectorId: 'connector-1',
        interactionId: 'run-1',
        definition,
        existingQueries: [],
        logger: loggerMock.create(),
      })
    ).rejects.toThrow('KI query generation agent finalized for unexpected target "logs.other"');
  });
});

describe('buildKIQueryGenerationUserMessage', () => {
  const target = {
    id: 'logs.test',
    name: 'logs.test',
    sources: ['logs.test'],
    samplingSource: 'logs.test',
  };

  it('omits existing_queries when there are none', () => {
    expect(buildKIQueryGenerationUserMessage(target, [])).toBe('`target_id`: logs.test');
  });

  it('bounds existing queries by severity, count and description length', () => {
    const existingQueries = Array.from(
      { length: MAX_EXISTING_QUERIES_FOR_CONTEXT + 5 },
      (_, i) => ({
        id: `query-${i}`,
        title: 'Error rate',
        type: 'stats',
        severity_score: i,
        description: 'x'.repeat(250),
        esql: 'FROM logs.test | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
      })
    );

    const [, context] = buildKIQueryGenerationUserMessage(target, existingQueries).split(
      '`existing_queries`:\n'
    );
    const surfaced: Array<{ severity_score: number; description: string }> = JSON.parse(context);

    expect(surfaced).toHaveLength(MAX_EXISTING_QUERIES_FOR_CONTEXT);
    expect(surfaced[0].severity_score).toBe(MAX_EXISTING_QUERIES_FOR_CONTEXT + 4);
    expect(surfaced.at(-1)?.severity_score).toBe(5);
    expect(surfaced[0].description).toHaveLength(200);
  });
});
