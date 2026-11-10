/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { loggerMock } from '@kbn/logging-mocks';
import { SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID } from '../../agent_builder/skills/ki_query_generation';
import { sourceWithSlug } from '../../agent_builder/utils/test_helpers';
import { readKIQueryGenerationResult } from './identify_ki_queries_via_agent';

const source = sourceWithSlug('logs.test', { description: 'Test logs' });

const validationStep = (toolCallId: string, data: Record<string, unknown>) => ({
  type: ConversationRoundStepType.toolCall,
  tool_id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
  tool_call_id: toolCallId,
  params: {},
  results: [{ type: ToolResultType.other, data }],
});

const conversationOf = (steps: unknown[]) =>
  ({
    rounds: [
      {
        steps,
        time_to_last_token: 1234,
        model_usage: { input_tokens: 10, output_tokens: 5, cached_input_tokens: 2 },
      },
    ],
  } as unknown as Pick<Conversation, 'rounds'>);

describe('readKIQueryGenerationResult', () => {
  const validatedQuery = {
    type: 'match' as const,
    title: 'Validated query',
    description: 'Detects validated failures',
    esql: { query: 'FROM logs.test | WHERE message:"failure"' },
    category: 'error' as const,
    severity_score: 60,
    features: [{ id: 'feature-1', run_id: 'run-1' }],
  };

  it('returns the finalized queries of the latest validation result', () => {
    const conversation = conversationOf([
      validationStep('validate-1', {
        slug: 'logs.test',
        finalized: true,
        finalized_queries: [{ ...validatedQuery, esql: { query: 'FROM superseded-validation' } }],
      }),
      validationStep('validate-2', {
        slug: 'logs.test',
        finalized: true,
        finalized_queries: [validatedQuery],
      }),
    ]);

    expect(
      readKIQueryGenerationResult({ conversation, source, logger: loggerMock.create() })
    ).toEqual({
      queries: [
        {
          type: 'match',
          title: 'Validated query',
          description: 'Detects validated failures',
          esql: { query: 'FROM logs.test | WHERE message:"failure"' },
          category: 'error',
          severity_score: 60,
          evidence: undefined,
          replaces: undefined,
          features: [{ id: 'feature-1', run_id: 'run-1' }],
        },
      ],
      tokensUsed: { prompt: 10, completion: 5, total: 15, cached: 2 },
      durationMs: 1234,
    });
  });

  it('counts the tokens of every round, since the step retries on the same conversation', () => {
    const finalized = conversationOf([
      validationStep('validate-1', {
        slug: 'logs.test',
        finalized: true,
        finalized_queries: [validatedQuery],
      }),
    ]);
    const conversation = {
      rounds: [
        { steps: [], model_usage: { input_tokens: 100, output_tokens: 40 } },
        ...finalized.rounds,
      ],
    } as unknown as Pick<Conversation, 'rounds'>;

    expect(
      readKIQueryGenerationResult({ conversation, source, logger: loggerMock.create() })
    ).toMatchObject({ tokensUsed: { prompt: 110, completion: 45, total: 155, cached: 2 } });
  });

  it('rejects queries finalized for a different source', () => {
    const conversation = conversationOf([
      validationStep('validate-1', { slug: 'logs.other', finalized: true, finalized_queries: [] }),
    ]);

    expect(() =>
      readKIQueryGenerationResult({ conversation, source, logger: loggerMock.create() })
    ).toThrow('KI query generation agent finalized for unexpected source "logs.other"');
  });

  it('returns null when the agent never finalized, so the workflow can run it again', () => {
    expect(
      readKIQueryGenerationResult({
        conversation: conversationOf([]),
        source,
        logger: loggerMock.create(),
      })
    ).toBeNull();
  });
});
