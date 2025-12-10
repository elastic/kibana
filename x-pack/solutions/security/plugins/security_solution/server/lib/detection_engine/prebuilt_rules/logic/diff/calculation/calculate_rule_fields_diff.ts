/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TwoWayRuleDiffCommonFields,
  TwoWayRuleDiffCustomQueryFields,
  TwoWayRuleDiffEqlFields,
  TwoWayRuleDiffEsqlFields,
  TwoWayRuleDiffMachineLearningFields,
  TwoWayRuleDiffNewTermsFields,
  TwoWayDiffRule,
  TwoWayRuleDiffSavedQueryFields,
  TwoWayRuleDiffThreatMatchFields,
  TwoWayRuleDiffThresholdFields,
  TwoWayRuleFieldsDiff,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_rule_diff';
import { normalizeRuleResponse } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/normalize_rule_response';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import type { TwoWayFieldsDiffAlgorithmsFor } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_diff_outcome';
import { deepEqualityDiffAlgorithm } from './two_way_diff_algorithms/deep_equality_diff_algorithm';
import { orderAgnosticArrayDiffAlgorithm } from './two_way_diff_algorithms/order_agnostic_array_diff_algorithm';

/**
 * Determines the diff between two rule response objects and returns a list of every rule field
 */
export const calculateRuleFieldsDiff = ({
  ruleA,
  ruleB,
}: {
  ruleA: RuleResponse;
  ruleB: RuleResponse;
}): TwoWayRuleFieldsDiff => {
  const normalizedRuleA = normalizeRuleResponse(ruleA);
  const normalizedRuleB = normalizeRuleResponse(ruleB);

  const fieldsDiff: Partial<TwoWayRuleFieldsDiff> = {};

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
        value_a: valueA,
        value_b: valueB,
      };
    }
  }
  return fieldsDiff as TwoWayRuleFieldsDiff;
};

/**
 * Field Comparators
 *
 * This is an exhaustive list of comparators based on the `RuleDiffField` types which is, aside from minor
 * omittances for non-diffable fields, a 1-to-1 extension of the `RuleResponse` schema. Every field we diff on
 * is listed here with its corresponding comparison logic. If a rule field is not listed here, it will not be
 * used in the diffing logic and will not be returned in the final outcome object.
 *
 * NOTE: When adding a new field to these comparators, also add a test for diff synchronization in `./calculate_rule_diff_synchronization.test.ts`
 */

const commonFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffCommonFields> = {
  version: deepEqualityDiffAlgorithm,
  name: deepEqualityDiffAlgorithm,
  tags: orderAgnosticArrayDiffAlgorithm,
  description: deepEqualityDiffAlgorithm,
  severity: deepEqualityDiffAlgorithm,
  severity_mapping: deepEqualityDiffAlgorithm,
  risk_score: deepEqualityDiffAlgorithm,
  risk_score_mapping: deepEqualityDiffAlgorithm,
  references: orderAgnosticArrayDiffAlgorithm,
  false_positives: deepEqualityDiffAlgorithm,
  threat: deepEqualityDiffAlgorithm,
  note: deepEqualityDiffAlgorithm,
  setup: deepEqualityDiffAlgorithm,
  related_integrations: deepEqualityDiffAlgorithm,
  required_fields: deepEqualityDiffAlgorithm,
  from: deepEqualityDiffAlgorithm,
  to: deepEqualityDiffAlgorithm,
  interval: deepEqualityDiffAlgorithm,
  investigation_fields: deepEqualityDiffAlgorithm,
  building_block_type: deepEqualityDiffAlgorithm,
  timeline_id: deepEqualityDiffAlgorithm,
  timeline_title: deepEqualityDiffAlgorithm,
  timestamp_override: deepEqualityDiffAlgorithm,
  timestamp_override_fallback_disabled: deepEqualityDiffAlgorithm,
  rule_name_override: deepEqualityDiffAlgorithm,
  max_signals: deepEqualityDiffAlgorithm,
};

const customQueryFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffCustomQueryFields> =
  {
    type: deepEqualityDiffAlgorithm,
    query: deepEqualityDiffAlgorithm,
    language: deepEqualityDiffAlgorithm,
    filters: deepEqualityDiffAlgorithm,
    saved_id: deepEqualityDiffAlgorithm,
    data_view_id: deepEqualityDiffAlgorithm,
    index: orderAgnosticArrayDiffAlgorithm,
    alert_suppression: deepEqualityDiffAlgorithm,
  };

const savedQueryFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffSavedQueryFields> = {
  type: deepEqualityDiffAlgorithm,
  query: deepEqualityDiffAlgorithm,
  language: deepEqualityDiffAlgorithm,
  filters: deepEqualityDiffAlgorithm,
  saved_id: deepEqualityDiffAlgorithm,
  data_view_id: deepEqualityDiffAlgorithm,
  index: orderAgnosticArrayDiffAlgorithm,
  alert_suppression: deepEqualityDiffAlgorithm,
};

const eqlFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffEqlFields> = {
  type: deepEqualityDiffAlgorithm,
  query: deepEqualityDiffAlgorithm,
  language: deepEqualityDiffAlgorithm,
  filters: deepEqualityDiffAlgorithm,
  data_view_id: deepEqualityDiffAlgorithm,
  index: orderAgnosticArrayDiffAlgorithm,
  alert_suppression: deepEqualityDiffAlgorithm,
  event_category_override: deepEqualityDiffAlgorithm,
  tiebreaker_field: deepEqualityDiffAlgorithm,
  timestamp_field: deepEqualityDiffAlgorithm,
};

const esqlFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffEsqlFields> = {
  type: deepEqualityDiffAlgorithm,
  query: deepEqualityDiffAlgorithm,
  language: deepEqualityDiffAlgorithm,
  alert_suppression: deepEqualityDiffAlgorithm,
};

const threatMatchFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffThreatMatchFields> =
  {
    type: deepEqualityDiffAlgorithm,
    query: deepEqualityDiffAlgorithm,
    language: deepEqualityDiffAlgorithm,
    filters: deepEqualityDiffAlgorithm,
    saved_id: deepEqualityDiffAlgorithm,
    data_view_id: deepEqualityDiffAlgorithm,
    index: orderAgnosticArrayDiffAlgorithm,
    alert_suppression: deepEqualityDiffAlgorithm,
    threat_query: deepEqualityDiffAlgorithm,
    threat_index: orderAgnosticArrayDiffAlgorithm,
    threat_filters: deepEqualityDiffAlgorithm,
    threat_indicator_path: deepEqualityDiffAlgorithm,
    threat_language: deepEqualityDiffAlgorithm,
    threat_mapping: deepEqualityDiffAlgorithm,
  };

const thresholdFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffThresholdFields> = {
  type: deepEqualityDiffAlgorithm,
  query: deepEqualityDiffAlgorithm,
  language: deepEqualityDiffAlgorithm,
  filters: deepEqualityDiffAlgorithm,
  saved_id: deepEqualityDiffAlgorithm,
  data_view_id: deepEqualityDiffAlgorithm,
  index: orderAgnosticArrayDiffAlgorithm,
  alert_suppression: deepEqualityDiffAlgorithm,
  threshold: deepEqualityDiffAlgorithm,
};

const machineLearningFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffMachineLearningFields> =
  {
    type: deepEqualityDiffAlgorithm,
    anomaly_threshold: deepEqualityDiffAlgorithm,
    machine_learning_job_id: deepEqualityDiffAlgorithm,
    alert_suppression: deepEqualityDiffAlgorithm,
  };

const newTermsFieldComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayRuleDiffNewTermsFields> = {
  type: deepEqualityDiffAlgorithm,
  query: deepEqualityDiffAlgorithm,
  language: deepEqualityDiffAlgorithm,
  filters: deepEqualityDiffAlgorithm,
  data_view_id: deepEqualityDiffAlgorithm,
  index: orderAgnosticArrayDiffAlgorithm,
  alert_suppression: deepEqualityDiffAlgorithm,
  new_terms_fields: orderAgnosticArrayDiffAlgorithm,
  history_window_start: deepEqualityDiffAlgorithm,
};

const allFieldsComparators: TwoWayFieldsDiffAlgorithmsFor<TwoWayDiffRule> = {
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
