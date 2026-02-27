/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DetectionAlert800 } from '../../../../common/api/detection_engine/model/alerts';

// ── Alert metadata ──────────────────────────────────────────────────────────

export interface AlertMeta {
  alert_id: string;
  alert_index: string;
  timestamp?: string;
  rule_name?: string;
  severity?: string;
  ts_ms?: number;
}

// ── Graph output ────────────────────────────────────────────────────────────

export interface RelatedAlertsGraphOutput {
  nodes: Array<{ id: string }>;
  edges: Array<{
    from: string;
    to: string;
    /**
     * Total score for this edge, computed as the sum of `label_scores`.
     */
    score: number;
    /**
     * Per-label scores that contributed to `score`. The keys implicitly represent the matched labels
     * (top-level field segment, e.g. `user.name` -> `user`).
     */
    label_scores: Record<string, number>;
  }>;
  alerts: Array<{
    alert_id: string;
    alert_index: string;
    timestamp?: string;
    rule_name?: string;
    severity?: string;
  }>;
  stats?: {
    depth_reached: number;
    nodes: number;
    edges: number;
    queries: number;
    time_range: { gte: string; lte: string };
  };
}

// ── Elasticsearch types ─────────────────────────────────────────────────────

export interface EsHit<TSource = DetectionAlert800> {
  _id?: string;
  _index: string;
  _source?: TSource;
  sort?: estypes.SortResults;
}

export interface EsSearchResponse<TSource = DetectionAlert800> {
  hits: { hits: Array<EsHit<TSource>> };
}

/**
 * Minimal search client interface.
 *
 * Compatible with the real `ElasticsearchClient` — the generic `<TSource>`
 * parameter lets callers specify the `_source` shape, and `sort` uses
 * ES's own `SortResults` type so there is no tuple-length mismatch.
 */
export interface EsSearchClient {
  search: <TSource = DetectionAlert800>(
    request: Record<string, unknown>
  ) => Promise<EsSearchResponse<TSource>>;
}

// ── Edge accumulator ────────────────────────────────────────────────────────

export type EdgeAccumulator = Map<
  string,
  {
    from: string;
    to: string;
    labelScores: Map<string, number>;
    score: number;
  }
>;

// ── Scoring configuration ───────────────────────────────────────────────────

export interface ScoringConfig {
  /**
   * Minimum score required to link an alert to at least one eligible parent.
   * Score is computed as the sum of per-label scores.
   */
  minEntityScore: number;
  /**
   * Per-field score overrides. Any field not present falls back to `defaultScorePerField`.
   */
  entityFieldScores: Map<string, number>;
  defaultScorePerField: number;
}
