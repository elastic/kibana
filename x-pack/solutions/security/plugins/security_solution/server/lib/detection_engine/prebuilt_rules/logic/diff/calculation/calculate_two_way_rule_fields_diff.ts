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
  TwoWayDiffCommonFields,
  TwoWayDiffCustomQueryFields,
  TwoWayDiffEqlFields,
  TwoWayDiffEsqlFields,
  TwoWayDiffNewTermsFields,
  TwoWayDiffRule,
  TwoWayDiffSavedQueryFields,
  TwoWayDiffThreatMatchFields,
  TwoWayDiffThresholdFields,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_diff';
import { normalizeRuleResponse } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/normalize_rule_response';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';
import type {
  FieldsComparatorsFor,
  TwoWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_diff_outcome';

export const calculateTwoWayRuleFieldsDiff = ({
  baseRule,
  currentRule,
}: {
  baseRule: RuleResponse;
  currentRule: RuleResponse;
}): TwoWayDiffOutcome<TwoWayDiffRule> => {
  const normalizedBaseRule = normalizeRuleResponse(baseRule) as TwoWayDiffRule;
  const normalizedCurrentRule = normalizeRuleResponse(currentRule) as TwoWayDiffRule;

  const fieldsDiff: Partial<TwoWayDiffOutcome<TwoWayDiffRule>> = {};

  const keys = new Set([...Object.keys(normalizedBaseRule), ...Object.keys(normalizedCurrentRule)]);
  for (const key of keys) {
    const fieldKey = key as keyof TwoWayDiffRule;
    const baseValue = normalizedBaseRule[fieldKey];
    const currentValue = normalizedCurrentRule[fieldKey];
    const comparator = allFieldsComparators[fieldKey];
    if (comparator) {
      if (!(fieldKey in normalizedBaseRule) || !(fieldKey in normalizedCurrentRule)) {
        fieldsDiff[fieldKey] = {
          is_equal: false,
        };
      } else {
        fieldsDiff[fieldKey] = {
          is_equal: comparator(baseValue, currentValue),
        };
      }
    }
  }
  return fieldsDiff as TwoWayDiffOutcome<TwoWayDiffRule>;
};

const commonFieldComparators: FieldsComparatorsFor<TwoWayDiffCommonFields> = {
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

const customQueryFieldComparators: FieldsComparatorsFor<TwoWayDiffCustomQueryFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const savedQueryFieldComparators: FieldsComparatorsFor<TwoWayDiffSavedQueryFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  filters: areFieldsEqual,
  saved_id: areFieldsEqual,
  data_view_id: areFieldsEqual,
  index: areArrayFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const eqlFieldComparators: FieldsComparatorsFor<TwoWayDiffEqlFields> = {
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

const esqlFieldComparators: FieldsComparatorsFor<TwoWayDiffEsqlFields> = {
  type: areFieldsEqual,
  query: areFieldsEqual,
  language: areFieldsEqual,
  alert_suppression: areFieldsEqual,
};

const threatMatchFieldComparators: FieldsComparatorsFor<TwoWayDiffThreatMatchFields> = {
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

const thresholdFieldComparators: FieldsComparatorsFor<TwoWayDiffThresholdFields> = {
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

const newTermsFieldComparators: FieldsComparatorsFor<TwoWayDiffNewTermsFields> = {
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

const allFieldsComparators = {
  ...commonFieldComparators,
  ...customQueryFieldComparators,
  ...savedQueryFieldComparators,
  ...eqlFieldComparators,
  ...esqlFieldComparators,
  ...threatMatchFieldComparators,
  ...thresholdFieldComparators,
  ...newTermsFieldComparators,
};
