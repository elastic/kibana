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
  /** Concise narrative shown when the table row is expanded via the leading chevron. */
  description: string;
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
