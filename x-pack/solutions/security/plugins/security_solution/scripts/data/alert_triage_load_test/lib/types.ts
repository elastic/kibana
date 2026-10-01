/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ground-truth label of a generated alert. Only ever stored in the manifest, never on the alert. */
export type AlertLabel = 'true_positive' | 'false_positive';

export interface PlannedAlert {
  label: AlertLabel;
  /** Index into the template pool of `label`. */
  templateIndex: number;
}

export interface PlannedBatch {
  batchId: string;
  /** Index of the synthetic rule that "produced" the batch. */
  ruleIndex: number;
  /** Milliseconds after the start of the run at which the batch is dispatched. */
  dispatchOffsetMs: number;
  alerts: PlannedAlert[];
}

export interface LoadPlan {
  seed: number;
  ruleCount: number;
  batches: PlannedBatch[];
  totalAlerts: number;
  falsePositiveAlerts: number;
  /** Offset of the last dispatch; the run lasts at least this long. */
  lastDispatchOffsetMs: number;
}

export interface TemplateCounts {
  truePositives: number;
  falsePositives: number;
}

export interface CommonPlanOptions {
  seed: number;
  ruleCount: number;
  /** Share of alerts labelled false positive, 0-1. */
  fpRate: number;
  templateCounts: TemplateCounts;
}

export interface BurstPlanOptions extends CommonPlanOptions {
  batchCount: number;
  batchSize: number;
}

export interface SustainedPlanOptions extends CommonPlanOptions {
  alertsPerHour: number;
  durationMs: number;
  /** Interval of the synthetic rules. Alerts of one rule that land in the same interval form one batch. */
  ruleIntervalMs: number;
  maxBatchSize: number;
  /** 0 spreads alerts evenly over the rules; larger values concentrate them on the first rules (Zipf exponent). */
  ruleSkew: number;
}

export interface DispatchedAlert {
  id: string;
  label: AlertLabel;
}

export interface DispatchRecord {
  batchId: string;
  ruleIndex: number;
  ruleUuid: string;
  plannedOffsetMs: number;
  /** Client clock, taken right before the run API call. */
  dispatchedAt: string;
  alerts: DispatchedAlert[];
  indexMs: number;
  runApiMs: number;
  executionId?: string;
  error?: string;
}
