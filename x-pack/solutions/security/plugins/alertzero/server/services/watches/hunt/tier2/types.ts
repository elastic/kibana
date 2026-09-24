/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntBehaviorArticleContext,
  HuntBehaviorIoc,
  HuntBehaviorStatus,
  HuntForThreatHit,
} from '@kbn/alertzero-common';

/** Severity level for a proposed behavioral rule. */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface BehaviorExecution {
  /** Dry-run passed and an execute call was attempted. */
  executed: boolean;
  /** Rows after the required-index filter. */
  row_count: number;
  /** True when at least one required-index row was returned. */
  hit: boolean;
}

export interface HuntBehaviorParams {
  text: string;
  report_id?: string;
  llm_confidence_threshold?: number;
  iocs?: HuntBehaviorIoc[];
  article_context?: HuntBehaviorArticleContext;
  /**
   * Hunt window. When present (and dry-run passed), grounded queries execute
   * against the environment. Absent → dry-run only, `has_hit` stays false.
   */
  window?: { from: string; to: string };
  /** Overrides `row_limit`, same resolution as Tier 1 (`size ?? scope.row_limit`). */
  size?: number;
  /** Scope row bound when `size` is absent. */
  row_limit?: number;
  /** Required index patterns that set the Tier 2 hit bar. */
  required_indices?: string[];
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
  execution?: BehaviorExecution;
  affected_hosts?: string[];
  affected_users?: string[];
  affected_hosts_truncated?: boolean;
  affected_users_truncated?: boolean;
  /** Required-index execute rows; same Discover-ref shape as Tier 1 `hits[]`. */
  hits?: HuntForThreatHit[];
}

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
   * True when any behavior's execute path found ≥1 row in a required index.
   * Independent of Tier 1: a technique-only report can set this without IOC hits.
   */
  has_hit: boolean;
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
