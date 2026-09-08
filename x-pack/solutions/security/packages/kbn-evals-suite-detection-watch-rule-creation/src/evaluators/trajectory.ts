/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import {
  GENERATE_ESQL_TOOL_ID,
  KNOWN_TOOL_IDS,
  RULE_CREATION_TOOL_ID,
  TRAJECTORY_MAX_TOOL_CALLS,
  TRAJECTORY_MIN_TOOL_CALLS,
} from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';
import { extractConversationId, toolSpanJoinClauses } from './tool_routing';

const TOOL_KIND = 'attributes.elastic.inference.span.kind == "TOOL"';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: Array<Array<string | null>>;
}

/**
 * Fetches the ordered list of tool names called during a run by querying TOOL spans.
 * Returns undefined when the join key matched no spans (unmeasured, not zero).
 */
const fetchToolNames = async (
  traceEsClient: EsClient,
  where: string
): Promise<string[] | undefined> => {
  const response = (await traceEsClient.esql.query({
    query: `FROM traces-*
| WHERE ${where} AND ${TOOL_KIND}
| SORT @timestamp ASC
| KEEP attributes.gen_ai.tool.name`,
  })) as unknown as EsqlResponse;

  const nameIdx = response.columns.findIndex((c) => c.name === 'attributes.gen_ai.tool.name');
  if (nameIdx === -1) return undefined;

  const names = response.values
    .map((row) => row[nameIdx] as string | null)
    .filter(Boolean) as string[];
  // Zero rows means the join key matched no TOOL spans — report as unmeasured.
  return names.length > 0 ? names : undefined;
};

/**
 * Trajectory evaluator (trace-based, direction: maximize).
 *
 * Scores whether the agent took a sensible path — not just whether it called the right
 * tool, but whether it called tools in the right order, the right number of times, and
 * without hallucinating unknown tools.
 *
 * Three sub-dimensions, averaged into one score:
 *
 *   1. Count — total tool calls in [TRAJECTORY_MIN_TOOL_CALLS, TRAJECTORY_MAX_TOOL_CALLS].
 *              Score degrades linearly outside the window; 0 at 0 calls or ≥ 2× max.
 *   2. Order — generate_esql appears before security.create_detection_rule. Score 1 or 0.
 *   3. Hallucination-free — every tool name is in KNOWN_TOOL_IDS.
 *              Score = known_calls / total_calls (partial credit for mostly-valid paths).
 *
 * Uses the same two-stage join as Tool Routing (workflow trace id → gen_ai.conversation.id)
 * and returns score: null when no spans are reachable rather than a false 0.
 */
export const createTrajectoryEvaluator = ({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator => ({
  direction: 'maximize',
  name: 'Trajectory',
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

    let toolNames: string[] | undefined;
    let joinedOn: string | undefined;

    for (const clause of toolSpanJoinClauses({ traceId, conversationId })) {
      try {
        const names = await fetchToolNames(traceEsClient, clause.where);
        if (names !== undefined) {
          toolNames = names;
          joinedOn = clause.name;
          break;
        }
      } catch (error) {
        log.debug(
          `Trajectory ${clause.name} join failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (toolNames === undefined) {
      log.warning('Trajectory unavailable — no TOOL spans reachable via any join key');
      return {
        score: null,
        label: 'unavailable',
        explanation:
          'No TOOL spans reachable via the workflow trace id or the draft conversation_id',
        metadata: undefined,
      };
    }

    // --- sub-dimension 1: count ---
    const total = toolNames.length;
    let countScore: number;
    if (total < TRAJECTORY_MIN_TOOL_CALLS) {
      countScore = total / TRAJECTORY_MIN_TOOL_CALLS;
    } else if (total > TRAJECTORY_MAX_TOOL_CALLS) {
      // Linear decay to 0 at 2× max.
      countScore = Math.max(0, 1 - (total - TRAJECTORY_MAX_TOOL_CALLS) / TRAJECTORY_MAX_TOOL_CALLS);
    } else {
      countScore = 1;
    }

    // --- sub-dimension 2: ordering ---
    const esqlIdx = toolNames.indexOf(GENERATE_ESQL_TOOL_ID);
    const createIdx = toolNames.indexOf(RULE_CREATION_TOOL_ID);
    const orderScore = esqlIdx !== -1 && createIdx !== -1 && esqlIdx < createIdx ? 1 : 0;

    // --- sub-dimension 3: hallucination-free ---
    const knownCalls = toolNames.filter((n) => KNOWN_TOOL_IDS.has(n)).length;
    const hallucinationScore = total > 0 ? knownCalls / total : 0;
    const hallucinated = toolNames.filter((n) => !KNOWN_TOOL_IDS.has(n));

    const score = (countScore + orderScore + hallucinationScore) / 3;

    return {
      score,
      label: undefined,
      explanation: `joined on ${joinedOn}`,
      metadata: {
        toolNames,
        total,
        countScore,
        orderScore,
        hallucinationScore,
        hallucinated,
        esqlIdx,
        createIdx,
      },
    };
  },
});
