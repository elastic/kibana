/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTraceResponse } from '@kbn/evals-common';

/** One hydrated step, in span start order. */
export type TraceSummaryStep =
  | { type: 'tool'; toolId: string }
  | { type: 'reasoning'; text: string };

/** What the matrix keeps from an OTel trace fetched via the evals trace route. */
export interface TraceSummary {
  /** Tool names in call order, from `execute_tool` spans. */
  toolIds: string[];
  /**
   * Tool calls interleaved with the subject model's narration before each tool-calling turn
   * (`reasoning`), ordered by span start time. `toolIds` is exactly the `tool` entries.
   */
  steps: TraceSummaryStep[];
  /** Summed over `chat *` spans; undefined when no span reported usage. */
  inputTokens?: number;
  outputTokens?: number;
  /** Root span duration in ms. */
  latencyMs?: number;
  /**
   * Final answer: the text parts of the last `chat <subjectModelId>` span  that ended with
   * `finish_reason: stop`. Undefined when no such span exists; never taken from helper-model spans.
   */
  answer?: string;
  /** Number of `chat` spans whose model matches the subject model id (0 = id mismatch). */
  subjectChatSpans?: number;
}

const EXECUTE_TOOL_PREFIX = 'execute_tool ';
const CHAT_PREFIX = 'chat ';

const toNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Score docs for EIS cells carry `eis-<provider>-<model>-<major>-<minor>` while trace spans are
 * named `chat <provider>-<model>-<major>.<minor>`. Strip the `eis-` marker and fold `.` into `-`
 * on both sides; this only ever equates ids that differ by those two characters.
 */
const canonicalModelId = (id: string): string => id.replace(/^eis-/, '').replace(/\./g, '-');

interface OutputMessage {
  finish_reason?: unknown;
  parts?: unknown;
}

/**
 * Text of a `gen_ai.output.messages` attribute when its message finished with `stop`; undefined
 * for tool-call turns, malformed JSON, or messages without text.
 */
const finalTextOf = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  let messages: unknown;
  try {
    messages = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(messages)) return undefined;
  const stopped = (messages as OutputMessage[]).filter(
    (message) => message && typeof message === 'object' && message.finish_reason === 'stop'
  );
  const text = stopped
    .flatMap((message) => (Array.isArray(message.parts) ? message.parts : []))
    .filter(
      (part): part is { type: 'text'; content: string } =>
        Boolean(part) &&
        part.type === 'text' &&
        typeof part.content === 'string' &&
        part.content.length > 0
    )
    .map((part) => part.content)
    .join('');
  return text.length > 0 ? text : undefined;
};

/**
 * Concatenated text parts of a `gen_ai.output.messages` attribute when a message finished with
 * `tool_calls` (the model's narration before calling tools); undefined for other finish reasons,
 * malformed JSON, or whitespace-only text.
 */
const narrationOf = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  let messages: unknown;
  try {
    messages = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!Array.isArray(messages)) return undefined;
  const text = (messages as OutputMessage[])
    .filter(
      (message) => message && typeof message === 'object' && message.finish_reason === 'tool_calls'
    )
    .flatMap((message) => (Array.isArray(message.parts) ? message.parts : []))
    .filter(
      (part): part is { type: 'text'; content: string } =>
        Boolean(part) && part.type === 'text' && typeof part.content === 'string'
    )
    .map((part) => part.content)
    .join('');
  return text.trim().length > 0 ? text : undefined;
};

/**
 * Reduces a trace's spans to the tool trail, token totals and root latency. A trace with
 * no spans carries no evidence about what the run did, so it yields `undefined` rather than
 * a summary whose empty trail would read as "the agent called no tools".
 */
export const summarizeTraceSpans = (
  { spans, duration_ms: durationMs }: GetTraceResponse,
  subjectModelId?: string
): TraceSummary | undefined => {
  if (spans.length === 0) {
    return undefined;
  }
  const ordered = [...spans].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));

  const toolIds: string[] = [];
  const steps: TraceSummaryStep[] = [];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let answer: string | undefined;
  let subjectChatSpans = 0;
  const subjectCanonical = subjectModelId ? canonicalModelId(subjectModelId) : undefined;
  const isSubjectSpan = (name: string): boolean =>
    subjectCanonical !== undefined &&
    name.startsWith(CHAT_PREFIX) &&
    canonicalModelId(name.slice(CHAT_PREFIX.length)) === subjectCanonical;

  for (const span of ordered) {
    if (span.name.startsWith(EXECUTE_TOOL_PREFIX)) {
      const named = span.attributes?.['gen_ai.tool.name'];
      const toolId =
        typeof named === 'string' && named.length > 0
          ? named
          : span.name.slice(EXECUTE_TOOL_PREFIX.length);
      toolIds.push(toolId);
      steps.push({ type: 'tool', toolId });
    } else if (span.name.startsWith(CHAT_PREFIX)) {
      const input = toNumber(span.attributes?.['gen_ai.usage.input_tokens']);
      const output = toNumber(span.attributes?.['gen_ai.usage.output_tokens']);
      if (input !== undefined) inputTokens = (inputTokens ?? 0) + input;
      if (output !== undefined) outputTokens = (outputTokens ?? 0) + output;
      if (isSubjectSpan(span.name)) {
        subjectChatSpans++;
        // Spans are start-ordered, so the last subject `stop` span wins.
        const text = finalTextOf(span.attributes?.['gen_ai.output.messages']);
        if (text !== undefined) answer = text;
        const narration = narrationOf(span.attributes?.['gen_ai.output.messages']);
        if (narration !== undefined) steps.push({ type: 'reasoning', text: narration });
      }
    }
  }

  // The root is the span whose parent is outside the fetched set.
  const spanIds = new Set(spans.map((span) => span.span_id));
  const roots = spans.filter((span) => !span.parent_span_id || !spanIds.has(span.parent_span_id));
  const rootDuration =
    roots.length > 0 ? Math.max(...roots.map((root) => root.duration_ms)) : undefined;

  return {
    toolIds,
    steps,
    inputTokens,
    outputTokens,
    latencyMs: rootDuration ?? durationMs,
    ...(answer !== undefined ? { answer } : {}),
    ...(subjectModelId ? { subjectChatSpans } : {}),
  };
};
