/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTraceResponse } from '@kbn/evals-common';

/** What the matrix keeps from an OTel trace fetched via the evals trace route. */
export interface TraceSummary {
  /** Tool names in call order, from `execute_tool` spans. */
  toolIds: string[];
  /** Summed over `chat *` spans; undefined when no span reported usage. */
  inputTokens?: number;
  outputTokens?: number;
  /** Root span duration in ms. */
  latencyMs?: number;
}

const EXECUTE_TOOL_PREFIX = 'execute_tool ';
const CHAT_PREFIX = 'chat ';

const toNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Reduces a trace's spans to the tool trail, token totals and root latency. A trace with
 * no spans carries no evidence about what the run did, so it yields `undefined` rather than
 * a summary whose empty trail would read as "the agent called no tools".
 */
export const summarizeTraceSpans = ({
  spans,
  duration_ms: durationMs,
}: GetTraceResponse): TraceSummary | undefined => {
  if (spans.length === 0) {
    return undefined;
  }
  const ordered = [...spans].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));

  const toolIds: string[] = [];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  for (const span of ordered) {
    if (span.name.startsWith(EXECUTE_TOOL_PREFIX)) {
      const named = span.attributes?.['gen_ai.tool.name'];
      const toolId =
        typeof named === 'string' && named.length > 0
          ? named
          : span.name.slice(EXECUTE_TOOL_PREFIX.length);
      toolIds.push(toolId);
    } else if (span.name.startsWith(CHAT_PREFIX)) {
      const input = toNumber(span.attributes?.['gen_ai.usage.input_tokens']);
      const output = toNumber(span.attributes?.['gen_ai.usage.output_tokens']);
      if (input !== undefined) inputTokens = (inputTokens ?? 0) + input;
      if (output !== undefined) outputTokens = (outputTokens ?? 0) + output;
    }
  }

  // The root is the span whose parent is outside the fetched set.
  const spanIds = new Set(spans.map((span) => span.span_id));
  const roots = spans.filter((span) => !span.parent_span_id || !spanIds.has(span.parent_span_id));
  const rootDuration =
    roots.length > 0 ? Math.max(...roots.map((root) => root.duration_ms)) : undefined;

  return {
    toolIds,
    inputTokens,
    outputTokens,
    latencyMs: rootDuration ?? durationMs,
  };
};
