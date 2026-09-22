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
