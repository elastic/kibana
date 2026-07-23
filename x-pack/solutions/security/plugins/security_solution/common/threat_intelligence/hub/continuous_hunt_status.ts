/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response for GET /api/threat_intelligence/continuous_hunt/status.
 * Shared by the Intelligence Hub continuous hunt strip and the route.
 */

export type ContinuousHuntPhase = 'idle' | 'hunting';

export interface ContinuousHuntStatusReport {
  id: string;
  title?: string;
  /** 1-based index of the report currently being hunted (or last completed). */
  index: number;
  total: number;
}

export interface ContinuousHuntStatusTier {
  current: 1 | 2;
  total: 2;
  label: string;
}

export interface ContinuousHuntStatusFindings {
  new_count: number;
  suppressed_count: number;
  /** Present only when we have a real indicator re-check count. */
  indicators_rechecked?: number;
}

export interface ContinuousHuntStatusResponse {
  phase: ContinuousHuntPhase;
  workflow_enabled: boolean;
  workflow_execution_id?: string;
  started_at?: string;
  last_completed_at?: string;
  next_run_at?: string;
  reports_hunted_last_cycle: number;
  report?: ContinuousHuntStatusReport;
  /** Coarse: orchestrator is one kibana.request step. */
  tier?: ContinuousHuntStatusTier;
  findings: ContinuousHuntStatusFindings;
  /** 24 hourly buckets, oldest → newest. */
  sparkline_24h: number[];
}
