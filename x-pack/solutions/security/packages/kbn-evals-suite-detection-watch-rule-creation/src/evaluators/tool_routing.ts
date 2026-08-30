/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createTraceBasedEvaluator } from '@kbn/evals';
import { RULE_CREATION_TOOL_ID } from '../constants';

/**
 * Tool Routing (trace-based, direction: maximize).
 *
 * The workflow's `draft_creation` step is instructed to call the
 * `security.create_detection_rule` tool; a model that answers from parametric
 * knowledge instead of calling the tool produces plausible-looking rule fields with
 * no backend write behind it. Scores 1 when at least one TOOL span with the expected
 * tool id is present on the execution's trace.
 *
 * Measurement honesty: Agent Builder attributes an agent step's tool spans via
 * `conversation_id` (see #284725's shared reader), so a workflow execution's own
 * trace can legitimately contain zero TOOL spans even when the agent called tools.
 * `STATS COUNT(*)` always returns one row — zero matches would otherwise score a
 * confident 0 (a false zero, not a model failure). Zero total TOOL spans is
 * therefore `isNotReported`: N/A, never 0, until the conversation-id join lands.
 */
export function createToolRoutingEvaluator({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}) {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: 'Tool Routing',
      direction: 'maximize',
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}" AND attributes.elastic.inference.span.kind == "TOOL"
| STATS tool_calls = COUNT(*), required_tool_calls = COUNT(
    CASE(
      attributes.gen_ai.tool.name == "${RULE_CREATION_TOOL_ID}",
      1,
      NULL
    )
  )`,
      extractResult: (response) => {
        const columns = response.columns ?? [];
        const row = (response.values ?? [])[0];
        if (!row) return null;
        const toolCallsIndex = columns.findIndex((c) => c.name === 'tool_calls');
        const requiredIndex = columns.findIndex((c) => c.name === 'required_tool_calls');
        if (toolCallsIndex === -1 || requiredIndex === -1) return null;
        const toolCalls = row[toolCallsIndex] as number | null | undefined;
        const requiredCalls = row[requiredIndex] as number | null | undefined;
        if (toolCalls == null) return null;
        return (requiredCalls ?? 0) > 0 ? 1 : 0;
      },
      // Zero TOOL spans on the trace = not measurable on this trace shape (agent
      // tool spans join via conversation_id, not the workflow trace id). Scored
      // N/A instead of 0 so an unmeasured run can never read as a model failure.
      isNotReported: (response) => {
        const toolCallsIndex = (response.columns ?? []).findIndex((c) => c.name === 'tool_calls');
        if (toolCallsIndex === -1) return true;
        const row = (response.values ?? [])[0];
        const toolCalls = row?.[toolCallsIndex] as number | null | undefined;
        return toolCalls == null || toolCalls === 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
