/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertMeta {
  alert_id: string;
  alert_index: string;
  timestamp?: string;
  rule_name?: string;
  severity?: string;
  ts_ms?: number;
}

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
  alerts_sorted: Array<{
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
