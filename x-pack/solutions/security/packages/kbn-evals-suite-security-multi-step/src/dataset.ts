/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type MultiStepScenarioId =
  | 'full_chain_triage_investigate_rule'
  | 'alert_investigate_rules_recommend'
  | 'entity_risk_alerts_correlation'
  | 'alert_triage_summary_report'
  | 'find_rules_mitre_coverage'
  | 'distractor_general';

export interface MultiStepExample {
  input: {
    turns: string[];
  };
  expected: {
    reference: string;
    tool_sequence?: string[];
    primary_skill?: string;
  };
  metadata: {
    scenario: MultiStepScenarioId;
    dataset_split: string[];
    is_distractor?: boolean;
  };
}
