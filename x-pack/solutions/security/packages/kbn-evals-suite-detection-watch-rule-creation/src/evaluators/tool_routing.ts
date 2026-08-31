/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { DRAFT_STEP_ID, RULE_CREATION_TOOL_ID } from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';

const TOOL_KIND = 'attributes.elastic.inference.span.kind == "TOOL"';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: Array<Array<number | string | null>>;
}

/**
 * Tool Routing (trace-based, direction: maximize).
 *
 * The workflow's draft_creation step is instructed to call the
 * `security.create_detection_rule` tool; a model that answers from parametric
 * knowledge instead produces plausible rule fields with no tool invocation
 * behind them. This evaluator scores 1 when at least one TOOL span invoking
 * that tool is found for the run.
 *
 * Span lookup is two-stage (#284725 not required):
 *  1. workflow trace id — direct join when agent spans share the workflow root span;
 *  2. the draft step's persisted `conversation_id` via `gen_ai.conversation.id`
 *     — Agent Builder conversations can fork their own root trace, which leaves
 *     stage 1 with zero TOOL spans (measured: every run of builds 455/457).
 *
 * Zero TOOL spans across BOTH stages is NOT a score: it means neither join
 * reached the agent's spans, so the run is scored N/A rather than a false 0
 * (STATS COUNT(*) always returns a row — an unmeasured trace otherwise reads
 * as a confident zero).
 */
export function createToolRoutingEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  const extractConversationId = (output: RuleCreationResult | undefined): string | undefined => {
    const draft = (output?.stepExecutions ?? []).find(
      (s) => s.stepId === DRAFT_STEP_ID && s.output != null
    );
    const id = (draft?.output as { conversation_id?: unknown } | null)?.conversation_id;
    return typeof id === 'string' ? id : undefined;
  };

  const countToolSpans = async (where: string): Promise<number | undefined> => {
    const response = (await traceEsClient.esql.query({
      query: `FROM traces-*\n| WHERE ${where} AND ${TOOL_KIND}\n| STATS tool_calls = COUNT(*),\n  required_tool_calls = COUNT(CASE(attributes.gen_ai.tool.name == "${RULE_CREATION_TOOL_ID}", 1, NULL))`,
    })) as unknown as EsqlResponse;
    const row = response.values?.[0];
    if (!row) return undefined;
    const totalIdx = response.columns.findIndex((c) => c.name === 'tool_calls');
    const reqIdx = response.columns.findIndex((c) => c.name === 'required_tool_calls');
    if (totalIdx === -1 || reqIdx === -1) return undefined;
    const total = row[totalIdx] as number | null | undefined;
    const required = row[reqIdx] as number | null | undefined;
    if (total == null) return undefined;
    if (total === 0) return undefined; // not reported on this join key
    return (required ?? 0) > 0 ? 1 : 0;
  };

  return {
    direction: 'maximize',
    name: 'Tool Routing',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const result = output as RuleCreationResult | undefined;
      const traceId = result?.traceId;
      const conversationId = extractConversationId(result);
      if (!traceId && !conversationId) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No traceId and no draft conversation_id to join tool spans on',
          metadata: undefined,
        };
      }

      // Stage 1: workflow trace id
      if (traceId) {
        try {
          const score = await countToolSpans(`trace.id == "${traceId}"`);
          if (score !== undefined) {
            return {
              score,
              label: undefined,
              explanation: 'joined on workflow trace id',
              metadata: undefined,
            };
          }
        } catch (error) {
          log.debug(
            `Tool Routing trace-id join failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Stage 2: Agent Builder conversation id
      if (conversationId) {
        try {
          const score = await countToolSpans(
            `attributes.gen_ai.conversation.id == "${conversationId}"`
          );
          if (score !== undefined) {
            return {
              score,
              label: undefined,
              explanation:
                'joined on gen_ai.conversation.id (agent conversation forked its own trace)',
              metadata: undefined,
            };
          }
        } catch (error) {
          log.debug(
            `Tool Routing conversation-id join failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      return {
        score: null,
        label: 'unavailable',
        explanation:
          'No TOOL spans reachable via the workflow trace id or the draft conversation_id — ' +
          'the agent conversation trace is not linkable with the available join keys (see #284725 ' +
          'for the shared reader that resolves this platform-side).',
        metadata: undefined,
      };
    },
  };
}
