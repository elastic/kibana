/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { readAgentToolCallsFromTraces } from '@kbn/security-evals-workflow-traces';
import { DRAFT_STEP_ID, RULE_CREATION_TOOL_ID } from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';

export const extractConversationId = (
  output: RuleCreationResult | undefined
): string | undefined => {
  const draft = (output?.stepExecutions ?? []).find(
    (s) => s.stepId === DRAFT_STEP_ID && s.output != null
  );
  const id = (draft?.output as { conversation_id?: unknown } | null)?.conversation_id;
  return typeof id === 'string' ? id : undefined;
};

export function createToolRoutingEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return {
    name: 'Tool Routing',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const result = output as RuleCreationResult | undefined;
      const conversationIds = extractConversationId(result);

      const { toolCallIds, unavailable } = await readAgentToolCallsFromTraces({
        traceEsClient,
        conversationIds,
        log,
      });

      if (unavailable) {
        return {
          score: null,
          label: 'unavailable',
          explanation:
            'No agent tool spans reachable for this run (no conversation id, or ' +
            'traces not exported) - unmeasured, not a routing failure.',
          metadata: undefined,
        };
      }

      const routed = toolCallIds.includes(RULE_CREATION_TOOL_ID);
      return {
        score: routed ? 1 : 0,
        label: undefined,
        explanation: routed
          ? `agent called ${RULE_CREATION_TOOL_ID}`
          : `agent never called ${RULE_CREATION_TOOL_ID} (saw: ${
              toolCallIds.join(', ') || 'no tools'
            })`,
        metadata: { toolCallIds },
      };
    },
  };
}
/**
 * Setup-time assertion that a run's agent tool spans are actually reachable in the tracing
 * cluster, using the SAME join clauses the Tool Routing evaluator scores with.
 *
 * A traceId on the execution document only proves the workflow was traced; it says nothing
 * about whether Agent Builder exported the tool spans the evaluator counts. Asserting the
 * weaker property armed the evaluators on a run that had no agent output at all
 * (measured: build 459, where 6 of 25 runs produced no rule yet setup passed).
 */
export const assertToolSpansReachable = async ({
  traceEsClient,
  probe,
  log,
}: {
  traceEsClient: EsClient;
  probe: RuleCreationResult;
  log: ToolingLog;
}): Promise<void> => {
  if (probe.skipped) {
    log.info('Trace reachability probe was declined by the quality gate - skipping span check');
    return;
  }

  const { toolCallIds, unavailable } = await readAgentToolCallsFromTraces({
    traceEsClient,
    conversationIds: extractConversationId(probe),
    log,
  });

  if (unavailable || toolCallIds.length === 0) {
    throw new Error(
      'No agent TOOL spans are reachable for the setup probe. Trace-based evaluators would ' +
        'score N/A on every example and the suite would still report a pass. Check that Agent ' +
        'Builder spans are exported to TRACING_ES_URL and that the draft step stores a conversation.'
    );
  }

  log.info(`Tool spans reachable (${toolCallIds.length} tool call(s) on the probe conversation)`);
};
