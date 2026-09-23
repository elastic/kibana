/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A single step in the agent's reasoning + tool-call trace. */
export interface TraceStep {
  type: 'reasoning' | 'tool' | 'skill';
  /** Reasoning text (for `type: 'reasoning'`). */
  text?: string;
  /** Tool call ID (for `type: 'tool'`). */
  toolId?: string;
  /** Tool call parameters (for `type: 'tool'`). */
  toolParams?: string;
  /** Skills selected (for `type: 'skill'`); Agent Builder may emit objects, normalised via `skillLabel`. */
  skills?: Array<string | { id?: string; name?: string }>;
}

/** Trace data for a single (model, column) pair. */
export interface MatrixTraceEntry {
  /** Suite the example ran under; direct example ids can repeat across suites, so
   * renderers need this to avoid showing another suite's trace in a column. */
  suiteId?: string;
  /** The initial user question from the eval dataset. */
  question?: string;
  /** Ordered list of tool IDs the agent called. */
  toolTrail?: string[];
  /** The agent's final answer (markdown). */
  answer?: string;
  /** Full reasoning + tool-call step trace. */
  steps?: TraceStep[];
  /** Number of steps (cached for summary table). */
  stepCount?: number;
  /** Number of tool calls (cached for summary table). */
  toolCount?: number;
  /** Per-evaluator mean score for this example over its repetitions. */
  scores?: Record<string, number>;
  /** Number of repetitions aggregated into this entry's scores. */
  repetitions?: number;
  /**
   * Per-evaluator spread (max - min) across repetitions. Only populated for
   * evaluators seen more than once; absence means stability is unknown.
   */
  spread?: Record<string, number>;
  /** Ordered tool identifiers observed in each repetition (invocation ids excluded). */
  repTrails?: string[][];
  /** Final answer text per repetition, index-aligned with `repTrails`. */
  repAnswers?: string[];
  /** The example's declared path contract from `example.metadata.pathContract`. */
  pathContract?: 'rankable' | 'candidate' | 'probe';
  /** Execution ids that contributed the repetitions above, for auditability. */
  repExecutionIds?: string[];
}

/** Map of trace entries keyed by `${modelId}:${columnId}`. */
export type MatrixTraceData = Record<string, MatrixTraceEntry>;

/** Builds the trace-data lookup key; unambiguous only because config ids are colon-free. */
export const traceKey = (modelId: string, columnId: string): string => `${modelId}:${columnId}`;

/**
 * Key for a direct per-example trace cell. Suite-scoped and marked with the
 * literal `direct` segment: two selected suites can reuse an example ID, so the
 * (model, example) pair alone is not a unique cell, and unmarked keys already
 * carry other meanings (`model:prefix:<p>`, `model:<suiteId>`). Suite ids are
 * validated only as nonempty strings and may contain `:`, so the suite
 * component is percent-encoded (colon included) and the parser decodes it —
 * the first colon after `:direct:` then always ends the suite.
 */
export const directTraceKey = (modelId: string, suiteId: string, exampleId: string): string =>
  `${modelId}:direct:${encodeURIComponent(suiteId)}:${exampleId}`;

/** Splits a `directTraceKey` back into its model, suite and example ids. */
export const parseDirectTraceKey = (
  key: string
): { modelId: string; suiteId: string; exampleId: string } | undefined => {
  if (!key.includes(':direct:')) {
    return undefined;
  }
  const first = key.indexOf(':');
  const second = key.indexOf(':', first + 1);
  const third = key.indexOf(':', second + 1);
  if (first < 1 || second < 0 || third < 0) {
    return undefined;
  }
  const suiteId = decodeSafe(key.slice(second + 1, third));
  if (suiteId === undefined) {
    return undefined;
  }
  return {
    modelId: key.slice(0, first),
    suiteId,
    exampleId: key.slice(third + 1),
  };
};

/** Decodes a percent-encoded key component; a malformed escape invalidates the key. */
const decodeSafe = (component: string): string | undefined => {
  try {
    return decodeURIComponent(component);
  } catch {
    return undefined;
  }
};
