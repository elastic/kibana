/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Extraction strategy used to retrieve alerts from a workflow execution. */
export type ExtractionStrategy = 'custom_workflow' | 'default_custom_query' | 'default_esql';

/** Per-workflow alert retrieval data extracted by extract_pipeline_alert_data. */
export interface AlertRetrievalData {
  /** Alert strings extracted from this workflow */
  alerts: string[];
  /** Count of alerts in context, or null when unknown (generic strategy) */
  alerts_context_count: number | null;
  /** Strategy used to extract these alerts */
  extraction_strategy: ExtractionStrategy;
}

/** Combined alerts from all retrieval workflow results. */
export interface CombinedAlerts {
  /** Concatenated alerts from all retrieval results */
  alerts: string[];
  /** Total alerts context count (uses alerts.length as fallback for null counts) */
  alerts_context_count: number;
}

/**
 * Combines alert data from all retrieval workflow results into a single
 * combined alerts structure.
 *
 * - Concatenates alert arrays from all results in order
 * - Sums known `alerts_context_count` values
 * - Uses `alerts.length` as fallback for generic strategy results
 *   where `alerts_context_count` is null
 */
export const computeCombinedAlerts = (
  retrievalResults: readonly AlertRetrievalData[]
): CombinedAlerts => {
  const alerts = retrievalResults.flatMap((result) => result.alerts);

  const alertsContextCount = retrievalResults.reduce(
    (sum, result) => sum + (result.alerts_context_count ?? result.alerts.length),
    0
  );

  return {
    alerts,
    alerts_context_count: alertsContextCount,
  };
};
