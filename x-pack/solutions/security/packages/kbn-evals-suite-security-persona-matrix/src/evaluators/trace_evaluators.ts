/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createTraceBasedEvaluator,
  type Evaluator,
  type TraceBasedEvaluatorConfig,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { TRACE_INDEX_PATTERN } from './trace_index_pattern';

/**
 * Suite-local twins of the shared Input Tokens / Output Tokens / Tool Calls /
 * Latency evaluators.
 *
 * The shared ones query `FROM traces-*`, which on a remote tracing cluster
 * resolves to zero authorized indices (the eval key is granted on the `.ds-`
 * backing indices; see `TRACE_INDEX_PATTERN`). They then fail every retry and
 * the metric is lost for every model. The queries below are copied from
 * `@kbn/evals` with only the index pattern widened, so the scores are
 * comparable with the shared evaluators' on a cluster where those work.
 */

const buildTraceEvaluator = ({
  traceEsClient,
  log,
  config,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  config: TraceBasedEvaluatorConfig;
}): Evaluator => createTraceBasedEvaluator({ traceEsClient, log, config });

interface Deps {
  traceEsClient: EsClient;
  log: ToolingLog;
}

const columnValue = (
  response: { columns: Array<{ name: string }>; values: unknown[][] },
  name: string
) => response.values[0][response.columns.findIndex((col) => col.name === name)] as number | null;

export const createPersonaMatrixOutputTokensEvaluator = (deps: Deps): Evaluator =>
  buildTraceEvaluator({
    ...deps,
    config: {
      name: 'Output Tokens',
      direction: 'minimize',
      // TO_LONG resolves union types (integer vs long across trace index generations).
      buildQuery: (traceId) => `FROM ${TRACE_INDEX_PATTERN}
        | WHERE trace.id == "${traceId}"
        | STATS
        output_tokens = SUM(TO_LONG(attributes.gen_ai.usage.output_tokens))`,
      extractResult: (response) => columnValue(response, 'output_tokens'),
      isResultValid: (result) => result !== null && result > 0,
    },
  });

export const createPersonaMatrixInputTokensEvaluator = (deps: Deps): Evaluator =>
  buildTraceEvaluator({
    ...deps,
    config: {
      name: 'Input Tokens',
      direction: 'minimize',
      buildQuery: (traceId) => `FROM ${TRACE_INDEX_PATTERN}
        | WHERE trace.id == "${traceId}"
        | STATS
        input_tokens = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens))`,
      extractResult: (response) => columnValue(response, 'input_tokens'),
      isResultValid: (result) => result !== null && result > 0,
    },
  });

export const createPersonaMatrixToolCallsEvaluator = (deps: Deps): Evaluator =>
  buildTraceEvaluator({
    ...deps,
    config: {
      name: 'Tool Calls',
      direction: 'neutral',
      buildQuery: (traceId) => `FROM ${TRACE_INDEX_PATTERN}
| WHERE trace.id == "${traceId}" AND attributes.elastic.inference.span.kind == "TOOL"
| STATS
  tool_calls = COUNT(*)`,
      extractResult: (response) => response.values[0][0] as number,
    },
  });

export const createPersonaMatrixLatencyEvaluator = (deps: Deps): Evaluator =>
  buildTraceEvaluator({
    ...deps,
    config: {
      name: 'Latency',
      direction: 'minimize',
      buildQuery: (traceId) => `FROM ${TRACE_INDEX_PATTERN}
| WHERE trace.id == "${traceId}"
| STATS total_duration_ns = MAX(duration)
| EVAL latency_seconds = TO_DOUBLE(total_duration_ns) / 1000000000
| KEEP latency_seconds`,
      extractResult: (response) => response.values[0][0] as number,
    },
  });
