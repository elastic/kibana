/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../common/api/detection_engine/model/rule_schema';

type AllKeys<U> = U extends unknown ? keyof U : never;

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
};

export const EXPECTED_MAX_TAGS = 65536;
