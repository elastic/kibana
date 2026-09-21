/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Severity level for a proposed behavioral rule. */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

/** IOC type used in the behavioral extraction params (mirrors Tier 1 IocType). */
export type HuntBehaviorIocType = 'ip' | 'email' | 'domain' | 'url' | 'hash';

export interface HuntBehaviorIoc {
  type: HuntBehaviorIocType;
  value: string;
}

/**
 * Optional Tier 1 environment-hit context passed by the coordinator after an
 * IOC lookup matches. Lets the Tier 2 extractor refine behavioral candidates
 * against the actual entities seen in the customer environment.
 */
export interface HuntBehaviorArticleContext {
  matched_indices?: string[];
  affected_hosts?: string[];
  affected_users?: string[];
  sample_events?: string[];
  time_range?: { from: string; to: string };
  proposed_atomic_rules?: Array<{
    rule_name: string;
    ioc_type: string;
    ioc_value: string;
  }>;
}

export interface HuntBehaviorParams {
  text: string;
  report_id?: string;
  llm_confidence_threshold?: number;
  iocs?: HuntBehaviorIoc[];
  article_context?: HuntBehaviorArticleContext;
}

/** A candidate behavior that passed ATT&CK catalog validation. No `finding_id` — that is Hub surface, dropped on lift. */
export interface ValidatedBehavior {
  technique_id: string;
  evidence_quote: string;
  llm_confidence: number;
  confidence: number;
  technique_name: string;
  reference: string;
  tactic_ids: string[];
  parent_technique_id?: string;
  proposed_esql_rule: string;
  rule_name: string;
  severity: SeverityLevel;
  risk_score: number;
}

export type HuntBehaviorStatus =
  | 'no_behaviors_found'
  | 'no_behaviors_validated'
  | 'behaviors_proposed';

export interface HuntBehaviorResult {
  status: HuntBehaviorStatus;
  report_id?: string;
  behaviors: ValidatedBehavior[];
  /**
   * Mapping-safe projection for `.kibana-threat-reports` extraction workflows —
   * strict nested `extracted.behaviors` rejects extra keys.
   */
  indexed_behaviors: IndexedBehavior[];
  dropped_unknown_ids?: string[];
  message?: string;
  next_step: string;
  /**
   * Tier 2 guarantee: Tier 2 never sets a hit flag directly. Hit determination
   * belongs to Tier 1 (`hasConfirmedHit`). This literal false enforces the
   * contract at the type level.
   */
  readonly hasHit: false;
}

/** Mapping-safe projection for `extracted.behaviors` in `.kibana-threat-reports`. */
export interface IndexedBehavior {
  id: string;
  technique_id: string;
  description: string;
  telemetry_targets?: string[];
  llm_confidence: number;
  confidence: number;
}
