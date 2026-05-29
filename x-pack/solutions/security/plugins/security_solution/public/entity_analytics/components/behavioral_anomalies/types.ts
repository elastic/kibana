/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservationSeverity } from '../../../../common/entity_analytics/lead_generation/types';

/**
 * Prototype domain model for enriched behavioral anomalies.
 * Shaped after ML Anomaly and lead-generation Observation types (local only).
 */
export interface BehavioralAnomaly {
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

export interface HeatmapRecord {
  '@timestamp': number;
  record_score: number;
  entity_id?: string;
  job_id?: string;
  [key: string]: string | number | undefined;
}

export interface EntityBehavioralAnomaliesSummary {
  totalCount: number;
  heatmapRecords: HeatmapRecord[];
}

export interface MockMlJob {
  id: string;
  displayName: string;
}

export interface UnderlyingEventRef {
  _id: string;
  _index: string;
}

export interface BehavioralAnomalyTableRow {
  id: string;
  jobId: string;
  jobDisplayName: string;
  timestamp: number;
  baseline: string;
  anomaly: string;
  spike?: string;
  anomalyScore: number;
  /** Mock references to the events that triggered the anomaly; used by Add to case / timeline / Discover. */
  underlyingEvents: UnderlyingEventRef[];
  /** Detector index for the ML job, used by Single metric viewer. */
  detectorIndex?: number;
  /** ML influencer / entity fields for Single metric viewer (e.g. user.name, host.name). */
  entities?: Record<string, string>;
}

export type ViewByField = 'job_id' | 'user.name' | 'host.name' | 'source.ip' | 'destination.ip' | 'event.category' | 'process.name';
