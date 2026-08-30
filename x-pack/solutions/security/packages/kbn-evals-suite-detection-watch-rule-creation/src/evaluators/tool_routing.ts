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
 * knowledge instead of calling the tool produces plausible-looking rule YAML with
 * no backend write behind it. This evaluator counts tool spans with the expected
 * tool id on the execution's trace and scores 1 when at least one is present.
 *
 * Depends on the execution document carrying a traceId — the EDOT fallback that
 * persists it under EDOT-only stacks landed in elastic/kibana#284701. A missing
 * traceId scores N/A (label `unavailable`), which the presence assertion in the
 * spec's beforeAll fails loudly on — it never silently degrades to a pass.
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
        const values = response.values ?? [];
        const row = values[0];
        if (!row) return null;
        const toolCallsIndex = columns.findIndex((c) => c.name === 'tool_calls');
        const requiredIndex = columns.findIndex((c) => c.name === 'required_tool_calls');
        if (toolCallsIndex === -1 || requiredIndex === -1) return null;
        const toolCalls = row[toolCallsIndex] as number | null | undefined;
        const requiredCalls = row[requiredIndex] as number | null | undefined;
        if (toolCalls == null) return null;
        return (requiredCalls ?? 0) > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
