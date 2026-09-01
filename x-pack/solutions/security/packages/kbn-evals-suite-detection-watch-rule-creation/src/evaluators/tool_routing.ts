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
        // includeFailures deliberately NOT set: its query references
        // attributes.gen_ai.tool.call.failed, absent from the Scout trace mapping
        // (build 498: verification_exception on every evaluation → N/A×30).
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

      // Sequence scoring: membership alone saturated at 1.000 on every run (490/493/496),
      // so it ranks nothing. The reader returns an ORDERED tool-call sequence; score
      // the routing shape on it:
      //   1.0  the required tool is the LAST call (clean routing, draft produced)
      //   0.5  required tool present but other calls follow it (post-draft wandering)
      //   0.0  required tool never called
      const lastIdx = toolCallIds.lastIndexOf(RULE_CREATION_TOOL_ID);
      const score = lastIdx === -1 ? 0 : lastIdx === toolCallIds.length - 1 ? 1 : 0.5;
      return {
        score,
        label: undefined,
        explanation:
          lastIdx === -1
            ? `agent never called ${RULE_CREATION_TOOL_ID} (saw: ${
                toolCallIds.join(', ') || 'no tools'
              })`
            : lastIdx === toolCallIds.length - 1
            ? `agent routed cleanly: ${RULE_CREATION_TOOL_ID} was the final tool call`
            : `agent called ${RULE_CREATION_TOOL_ID} but calls followed it: ${toolCallIds
                .slice(lastIdx + 1)
                .join(', ')}`,
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
