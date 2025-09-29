/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { RuleResponse } from '../api/detection_engine/model/rule_schema';

export enum RULE_PREVIEW_INVOCATION_COUNT {
  HOUR = 12,
  DAY = 24,
  WEEK = 168,
  MONTH = 30,
}

export enum RULE_PREVIEW_INTERVAL {
  HOUR = '5m',
  DAY = '1h',
  WEEK = '1h',
  MONTH = '1d',
}

export enum RULE_PREVIEW_FROM {
  HOUR = 'now-6m',
  DAY = 'now-65m',
  WEEK = 'now-65m',
  MONTH = 'now-25h',
}

export const PREBUILT_RULES_PACKAGE_NAME = 'security_detection_engine';
export const ENDPOINT_PACKAGE_NAME = 'endpoint';
export const SECURITY_AI_PROMPTS_PACKAGE_NAME = 'security_ai_prompts';

/**
 * Rule signature id (`rule.rule_id`) of the prebuilt "Endpoint Security" rule.
 */
export const ELASTIC_SECURITY_RULE_ID = '9a1a2dae-0b5f-4c3d-8305-a268d404c306';

export const DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY = 'suppress' as const;

export const MINIMUM_LICENSE_FOR_SUPPRESSION = 'platinum' as const;

export const SUPPRESSIBLE_ALERT_RULES: Type[] = [
  'threshold',
  'esql',
  'saved_query',
  'query',
  'new_terms',
  'threat_match',
  'eql',
  'machine_learning',
];

export const SUPPRESSIBLE_ALERT_RULES_GA: Type[] = [
  'threshold',
  'esql',
  'saved_query',
  'query',
  'new_terms',
  'threat_match',
  'machine_learning',
  'eql',
];

export const RISK_SCORE_LOW = 21;
export const RISK_SCORE_MEDIUM = 47;
export const RISK_SCORE_HIGH = 73;
export const RISK_SCORE_CRITICAL = 99;

export const defaultRiskScoreBySeverity: Record<Severity, number> = {
  low: RISK_SCORE_LOW,
  medium: RISK_SCORE_MEDIUM,
  high: RISK_SCORE_HIGH,
  critical: RISK_SCORE_CRITICAL,
};

type AllKeys<U> = U extends any ? keyof U : never;

/**
 * A list of all possible fields in the RuleResponse type mapped to whether or not the field is
 * considered functional. We are defining "functional" to mean having a direct impact on how a
 * rule executes. This means fields like `query` will be marked as functional while fields like
 * `note` will be marked as non-functional. We are being conservative in our labeling of
 * functional and only fields that have a 100% guaranteed impact on rule execution will be labeled
 * as such. Fields like `index` that have a direct impact but don't necessarily change the alert
 * rate (noise) of a rule will not be marked as functional.
 * 
 * This categorization is intended to be used for telemetry purposes.
 * 
 * More info here:
 * x-pack/solutions/security/plugins/security_solution/docs/rfcs/detection_response/customized_rule_alert_telemetry.md
 */
export const FUNCTIONAL_FIELD_MAP: Record<AllKeys<RuleResponse>, boolean> = {
  // Common fields
  name: false,
  description: false,
  risk_score: false,
  severity: false,
  rule_name_override: false,
  timestamp_override: false,
  timestamp_override_fallback_disabled: false,
  timeline_id: false,
  timeline_title: false,
  license: false,
  note: false,
  building_block_type: false,
  investigation_fields: false,
  version: false,
  tags: false,
  risk_score_mapping: false,
  severity_mapping: false,
  interval: false,
  from: false,
  to: false,
  author: false,
  false_positives: false,
  references: false,
  max_signals: false,
  threat: false,
  setup: false,
  related_integrations: false,
  required_fields: false,
  type: true,
  // Query, EQL, and ESQL rule type fields
  query: true,
  language: true,
  index: false,
  data_view_id: false,
  filters: true,
  event_category_override: true,
  tiebreaker_field: true,
  timestamp_field: true,
  alert_suppression: true,
  // Saved query rule type fields
  saved_id: true,
  // Threshold rule type fields
  threshold: true,
  // Threat match rule type fields
  threat_query: true,
  threat_mapping: true,
  threat_index: false,
  threat_filters: true,
  threat_indicator_path: false,
  threat_language: true,
  // Maching learning rule type fields
  anomaly_threshold: true,
  machine_learning_job_id: true,
  // New terms rule type fields
  new_terms_fields: true,
  history_window_start: true,
  // Response fields - We don't use these fields for diffing purposes, setting the values to false
  id: false,
  rule_id: false,
  rule_source: false,
  outcome: false,
  output_index: false,
  namespace: false,
  exceptions_list: false,
  execution_summary: false,
  actions: false,
  throttle: false,
  alias_purpose: false,
  alias_target_id: false,
  meta: false,
  response_actions: false,
  revision: false,
  enabled: false,
  items_per_search: false,
  concurrent_searches: false,
  immutable: false,
  updated_at: false,
  updated_by: false,
  created_at: false,
  created_by: false,
}