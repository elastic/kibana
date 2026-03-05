/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Rule-type-specific diagnostic fields for indicator match rules.
 */
const IndicatorMatchDiagnostics = z.object({
  threat_indicators_count: z.number().int().min(0).optional(),
  threat_index_patterns: z.array(z.string()).optional(),
  threat_query_zero_hits: z.boolean().optional(),
  uses_cross_cluster_search: z.boolean().optional(),
});

/**
 * Rule-type-specific diagnostic fields for threshold rules.
 */
const ThresholdDiagnostics = z.object({
  threshold_value: z.number().int().min(0).optional(),
  threshold_group_by_fields: z.array(z.string()).optional(),
  threshold_met_count: z.number().int().min(0).optional(),
  threshold_zero_reason: z.enum(['no_group_by', 'count_below_threshold', 'no_events']).optional(),
});

/**
 * Rule-type-specific diagnostic fields for ES|QL rules.
 */
const EsqlDiagnostics = z.object({
  is_aggregating: z.boolean().optional(),
  iterations: z.number().int().min(0).optional(),
  excluded_documents_count: z.number().int().min(0).optional(),
  async_search_cancelled: z.boolean().optional(),
});

/**
 * Rule-type-specific diagnostic fields for EQL rules.
 */
const EqlDiagnostics = z.object({
  is_sequence_query: z.boolean().optional(),
  shard_failures_count: z.number().int().min(0).optional(),
});

/**
 * Rule-type-specific diagnostic fields for ML rules.
 */
const MlDiagnostics = z.object({
  job_ids: z.array(z.string()).optional(),
  all_jobs_started: z.boolean().optional(),
  anomaly_count: z.number().int().min(0).optional(),
  anomaly_threshold: z.number().optional(),
  filtered_anomaly_count: z.number().int().min(0).optional(),
});

/**
 * Rule-type-specific diagnostic fields for new terms rules.
 */
const NewTermsDiagnostics = z.object({
  new_terms_fields: z.array(z.string()).optional(),
  pages_searched: z.number().int().min(0).optional(),
});

/**
 * A single execution outcome document written at the end of each rule execution.
 * Captures comprehensive diagnostics for troubleshooting:
 * - Data & indexing issues (missing indices, inaccessible indices, frozen tier)
 * - Rule logic diagnostics (query used, timestamp field, threshold outcomes)
 * - Exception processing (unprocessed items, reasons)
 * - Execution health (timeouts, cancellations, gaps)
 * - Permissions (API key access failures, inaccessible indices)
 * - Rule-type-specific data (threat indicators, ML anomalies, etc.)
 *
 * This document also supports monitoring rules that stop generating alerts
 * by tracking consecutive runs with zero alerts created.
 */
export type ExecutionOutcomeDocument = z.infer<typeof ExecutionOutcomeDocument>;
export const ExecutionOutcomeDocument = z.object({
  /** ISO timestamp of when the document was written */
  '@timestamp': z.string(),

  /** Unique ID for this rule execution */
  execution_id: z.string(),

  /** Saved object ID of the rule */
  rule_id: z.string(),

  /** Static/signature ID of the rule (rule.rule_id) */
  rule_uuid: z.string(),

  rule_name: z.string(),
  rule_revision: z.number().int(),
  rule_type: z.string(),
  space_id: z.string(),

  // --- Execution outcome ---
  status: z.string(),
  status_message: z.string().optional(),

  // --- Timing ---
  execution_duration_ms: z.number().int().min(0),
  started_at: z.string(),
  completed_at: z.string(),
  schedule_delay_ms: z.number().int().min(0).optional(),

  // --- Performance metrics ---
  total_search_duration_ms: z.number().int().min(0).optional(),
  total_indexing_duration_ms: z.number().int().min(0).optional(),
  total_enrichment_duration_ms: z.number().int().min(0).optional(),

  // --- Alert outcomes ---
  alerts_created_count: z.number().int().min(0),
  alerts_suppressed_count: z.number().int().min(0),
  events_found_count: z.number().int().min(0),
  /** Events found but not turned into alerts (duplicates, exceptions, etc.) */
  events_excluded_count: z.number().int().min(0),

  // --- Execution gap ---
  execution_gap_duration_s: z.number().int().min(0).optional(),
  gap_range: z.object({ gte: z.string(), lte: z.string() }).optional(),

  // --- Data & indexing diagnostics ---
  input_index_patterns: z.array(z.string()),
  indices_accessed_count: z.number().int().min(0).optional(),
  indices_inaccessible: z.array(z.string()).optional(),
  indices_missing_timestamp_field: z.array(z.string()).optional(),
  timestamp_field_used: z.string(),
  timestamp_override: z.string().optional(),
  frozen_indices_queried_count: z.number().int().min(0),
  found_no_indices: z.boolean(),

  // --- Exception diagnostics ---
  exception_lists_count: z.number().int().min(0),
  exception_items_count: z.number().int().min(0),
  unprocessed_exceptions_count: z.number().int().min(0),
  unprocessed_exception_reasons: z.array(z.string()).optional(),

  // --- Execution health ---
  timed_out: z.boolean(),
  execution_cancelled: z.boolean(),

  // --- Permissions diagnostics ---
  has_permission_errors: z.boolean(),
  permission_error_details: z.string().optional(),

  // --- Errors and warnings accumulated during execution ---
  errors: z.array(
    z.object({
      message: z.string(),
      timestamp: z.string(),
    })
  ),
  warnings: z.array(
    z.object({
      message: z.string(),
      timestamp: z.string(),
    })
  ),

  // --- Rule-type-specific diagnostics ---
  indicator_match: IndicatorMatchDiagnostics.optional(),
  threshold: ThresholdDiagnostics.optional(),
  esql: EsqlDiagnostics.optional(),
  eql: EqlDiagnostics.optional(),
  ml: MlDiagnostics.optional(),
  new_terms: NewTermsDiagnostics.optional(),

  // --- Monitoring: alerting health for "no alerts in expected period" detection ---
  /** Timestamp of the most recent alert created by this rule (carried forward across executions) */
  last_alert_created_at: z.string().optional(),
  /** Number of consecutive rule runs that produced zero alerts */
  consecutive_no_alert_runs: z.number().int().min(0).optional(),
});

/**
 * Partial type used to accumulate stats incrementally during execution via
 * `ruleExecutionLogger.stats(...)`.
 */
export type ExecutionOutcomeStats = Partial<
  Omit<
    ExecutionOutcomeDocument,
    | '@timestamp'
    | 'execution_id'
    | 'rule_id'
    | 'rule_uuid'
    | 'rule_name'
    | 'rule_revision'
    | 'rule_type'
    | 'space_id'
  >
>;
