/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario category for an alerts RAG example.
 * - single_alert_query: User asks about a specific individual alert.
 * - multi_alert_correlation: User asks about patterns, counts, prioritisation,
 *   or relationships that require reasoning across multiple alerts at once.
 * - temporal_query: User asks about time-based aspects of alerts (e.g.
 *   "last hour", "trending", "first seen").
 * - field_specific_lookup: User asks which hosts, IPs, users, or other field
 *   values appear in the alert set.
 */
export type AlertsRagCategory =
  | 'single_alert_query'
  | 'multi_alert_correlation'
  | 'temporal_query'
  | 'field_specific_lookup';

/**
 * One question/reference pair driven through Agent Builder.
 *
 * The alert context is NOT embedded — the Agent Builder agent under test
 * retrieves alerts from Elasticsearch via its own tools (`security.alerts`
 * and friends). The eval cluster has the shared security alerts snapshot
 * loaded by `restoreAlertsSnapshot` before the suite runs.
 */
export interface AlertsRagExample {
  input: string;
  expected: {
    reference: string;
    /**
     * Minimum sufficient agent-builder tool sequence to answer this question,
     * EXCLUDING `filestore.read` (which is already covered by the
     * skill-invocation evaluator and would otherwise show up as noisy "extra
     * tools" in the trajectory report).
     *
     * Used by the trajectory evaluator (`@kbn/evals`'s
     * `createTrajectoryEvaluator`): scored via LCS for order + set
     * intersection for coverage. Examples without a `tool_sequence` skip
     * trajectory scoring and report N/A so partial annotation does not
     * misleadingly penalise unannotated examples.
     *
     * Tool IDs must match registered agent-builder tool ids, e.g.
     * `security.alerts`, `security.security_labs_search`,
     * `security.entity_risk_score`,
     * `security.alert-analysis.get-related-alerts`.
     */
    tool_sequence?: string[];
  };
  metadata: {
    category: AlertsRagCategory;
    dataset_split: string[];
  };
}
