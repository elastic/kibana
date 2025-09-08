/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  areArrayFieldsEqual,
  areFieldsEqual,
} from '../../../../../../../common/detection_engine/prebuilt_rules/comparators';
import type {
  RuleDiffCommonFields,
  RuleDiffCustomQueryFields,
  RuleDiffEqlFields,
  RuleDiffEsqlFields,
  RuleDiffMachineLearningFields,
  RuleDiffNewTermsFields,
  TwoWayDiffRule,
  RuleDiffSavedQueryFields,
  RuleDiffThreatMatchFields,
  RuleDiffThresholdFields,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';
import { normalizeRuleResponse } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/normalize_rule_response';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import type {
  FieldsComparatorsFor,
  RuleDiffOutcome,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff_outcome';

/**
 * Determines the diff between two rule response objects and returns a list of every rule field
 */
export const calculateRuleFieldsDiff = ({
  ruleA,
  ruleB,
}: {
  ruleA: RuleResponse;
  ruleB: RuleResponse;
}): RuleDiffOutcome<TwoWayDiffRule> => {
  const normalizedRuleA = normalizeRuleResponse(ruleA);
  const normalizedRuleB = normalizeRuleResponse(ruleB);

  const fieldsDiff: Partial<RuleDiffOutcome<TwoWayDiffRule>> = {};

  const keys = new Set([...Object.keys(normalizedRuleA), ...Object.keys(normalizedRuleB)]);
  for (const key of keys) {
    const fieldKey = key as keyof TwoWayDiffRule;
    const valueA = normalizedRuleA[fieldKey];
    const valueB = normalizedRuleB[fieldKey];

    const comparator = allFieldsComparators[fieldKey] as
      | ((a: unknown, b: unknown) => boolean)
      | undefined;

    // We only compare fields if there is a comparator explicitly defined for the field in the lists below
    if (comparator) {
      fieldsDiff[fieldKey] = {
        is_equal: comparator(valueA, valueB),
      };
    }
  }
  return fieldsDiff as RuleDiffOutcome<TwoWayDiffRule>;
};

const commonFieldComparators: FieldsComparatorsFor<RuleDiffCommonFields> = {
  version: areFieldsEqual,
  name: areFieldsEqual,
  tags: areArrayFieldsEqual,
  description: areFieldsEqual,
  severity: areFieldsEqual,
  severity_mapping: areFieldsEqual,
  risk_score: areFieldsEqual,
  risk_score_mapping: areFieldsEqual,
  references: areArrayFieldsEqual,
  false_positives: areFieldsEqual,
  threat: areFieldsEqual,
  note: areFieldsEqual,
  setup: areFieldsEqual,
  related_integrations: areFieldsEqual,
  required_fields: areFieldsEqual,
  from: areFieldsEqual,
  to: areFieldsEqual,
  interval: areFieldsEqual,
  investigation_fields: areFieldsEqual,
  building_block_type: areFieldsEqual,
  timeline_id: areFieldsEqual,
  timeline_title: areFieldsEqual,
  timestamp_override: areFieldsEqual,
  timestamp_override_fallback_disabled: areFieldsEqual,
  rule_name_override: areFieldsEqual,
  max_signals: areFieldsEqual,
};

const customQueryFieldComparators: FieldsComparatorsFor<RuleDiffCustomQueryFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const savedQueryFieldComparators: FieldsComparatorsFor<RuleDiffSavedQueryFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const eqlFieldComparators: FieldsComparatorsFor<RuleDiffEqlFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
  event_category_override: areFieldsEqual,
  tiebreaker_field: areFieldsEqual,
  timestamp_field: areFieldsEqual,
};

const esqlFieldComparators: FieldsComparatorsFor<RuleDiffEsqlFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const threatMatchFieldComparators: FieldsComparatorsFor<RuleDiffThreatMatchFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
  threat_query: areFieldsEqual,
  threat_index: areArrayFieldsEqual,
  threat_filters: areFieldsEqual,
  threat_indicator_path: areFieldsEqual,
  threat_language: areFieldsEqual,
  threat_mapping: areFieldsEqual,
};

const thresholdFieldComparators: FieldsComparatorsFor<RuleDiffThresholdFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
  threshold: areFieldsEqual,
};

const machineLearningFieldComparators: FieldsComparatorsFor<RuleDiffMachineLearningFields> = {
  type: areFieldsEqual,
  anomaly_threshold: areFieldsEqual,
  machine_learning_job_id: areFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const newTermsFieldComparators: FieldsComparatorsFor<RuleDiffNewTermsFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
  new_terms_fields: areArrayFieldsEqual,
  history_window_start: areFieldsEqual,
};

const allFieldsComparators: FieldsComparatorsFor<TwoWayDiffRule> = {
  ...commonFieldComparators,
  ...customQueryFieldComparators,
  ...savedQueryFieldComparators,
  ...eqlFieldComparators,
  ...esqlFieldComparators,
  ...threatMatchFieldComparators,
  ...thresholdFieldComparators,
  ...machineLearningFieldComparators,
  ...newTermsFieldComparators,
};
