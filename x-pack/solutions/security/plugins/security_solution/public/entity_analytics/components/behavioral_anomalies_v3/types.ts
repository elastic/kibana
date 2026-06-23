/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservationSeverity } from '../../../../common/entity_analytics/lead_generation/types';

/**
 * Prototype "BA-v.3" domain model — mirrors `behavioral_anomalies/types.ts`.
 * Kept here so the v3 tab can be deleted without touching v1 or v2 (and vice versa).
 */
export interface BehavioralAnomalyV3 {
  id: string;
  entityId: string;
  jobId: string;
  behaviorType: string;
  severity: ObservationSeverity;
  score: number;
  time: number;
  description: string;
  onset?: string;
  durationHours?: number;
  recurrenceCount?: number;
  baseline?: { typical: number[]; actual: number[] };
  correlatedAnomalyIds?: string[];
}

export interface HeatmapRecordV3 {
  '@timestamp': number;
  record_score: number;
  entity_id?: string;
  job_id?: string;
  /** Prototype field: MITRE ATT&CK tactic name used as the swim lane Y key. */
  mitre_tactic?: string;
  [key: string]: string | number | undefined;
}

export interface EntityBehavioralAnomaliesV3Summary {
  totalCount: number;
  heatmapRecords: HeatmapRecordV3[];
}

export interface MockMlJobV3 {
  id: string;
  displayName: string;
}

export interface UnderlyingEventRefV3 {
  _id: string;
  _index: string;
}

/**
 * Inline segments used to render the "Explainer" body in the expanded row so
 * that numeric spike highlights (e.g. "42×", "12×-18×") can be wrapped in a
 * hollow `EuiBadge` with danger-colored text and an upward arrow — matching
 * the BA-v.3 design. The shape is intentionally a tagged union so consumers
 * exhaustively render either plain text or a spike chip with no string
 * parsing on the render path.
 */
export type ExplainerSegmentV3 = { readonly text: string } | { readonly spike: string };

export interface BehavioralAnomalyV3TableRow {
  id: string;
  jobId: string;
  jobDisplayName: string;
  timestamp: number;
  baseline: string;
  anomaly: string;
  spike?: string;
  anomalyScore: number;
  /** MITRE ATT&CK tactics the row maps to (one or more). Shown as hollow badges in the Tactic column. */
  mitreTactics: string[];
  /**
   * Inline-segment narrative rendered in the expanded row's "Explainer"
   * section. Any `{ spike }` segment is rendered as a hollow EuiBadge with
   * an upward arrow and danger-colored text; `{ text }` segments are joined
   * inline into the surrounding paragraph.
   */
  explainer: readonly ExplainerSegmentV3[];
  /** Approximate count of underlying events that fed the anomaly score. */
  countOfSourceEvents: number;
  /**
   * Key ECS-style fields to surface in the expanded row, formatted as
   * `field=value` and joined with `; ` at render time.
   */
  keyFields: readonly string[];
  /** Mock references to the events that triggered the anomaly; used by Add to case / timeline / Discover. */
  underlyingEvents: UnderlyingEventRefV3[];
  /** Detector index for the ML job, used by Single metric viewer. */
  detectorIndex?: number;
  /** ML influencer / entity fields for Single metric viewer (e.g. user.name, host.name). */
  entities?: Record<string, string>;
}

export type ViewByFieldV3 =
  | 'job_id'
  | 'mitre_tactic'
  | 'user.name'
  | 'host.name'
  | 'source.ip'
  | 'destination.ip'
  | 'event.category'
  | 'process.name';
