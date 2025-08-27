/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredOptional } from '@kbn/zod-helpers';
import { TimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { normalizeDateMath } from '@kbn/securitysolution-utils/date_math';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';
import { assertUnreachable } from '../../../utility_types';
import type {
  RuleResponse,
  TypeSpecificResponse,
} from '../../../api/detection_engine/model/rule_schema';
import { addEcsToRequiredFields } from '../../rule_management/utils';
import { normalizeThreatArray } from './normalizers/normalize_threat_array';
import { normalizeRuleThreshold } from './normalizers/normalize_rule_threshold';
import { normalizeFilterArray } from './normalizers/normalize_filter_array';
import { normalizeQueryField } from './normalizers/normalize_query_field';

export const normalizeRuleResponse = (rule: RuleResponse): RuleResponse => {
  const typeSpecificFields = normalizeTypeSpecificFields(rule);
  const commonFields = normalizeCommonResponseFields(rule);

  return {
    ...rule,
    ...commonFields,
    ...typeSpecificFields,
  };
};

// Only contains fields that need to be normalized, we spread the original rule object already
const normalizeCommonResponseFields = (rule: RuleResponse) => {
  return {
    name: rule.name?.trim(),
    tags: rule.tags ?? [],
    severity_mapping: rule.severity_mapping ?? [],
    risk_score_mapping: rule.risk_score_mapping?.map((mapping) => requiredOptional(mapping)) ?? [],
    references: rule.references ?? [],
    false_positives: rule.false_positives ?? [],
    threat: normalizeThreatArray(rule.threat) ?? [],
    note: rule.note ?? '',
    setup: rule.setup ?? '',
    related_integrations: rule.related_integrations ?? [],
    required_fields: addEcsToRequiredFields(rule.required_fields),
    interval: (TimeDuration.parse(rule.interval) ?? new TimeDuration(5, 'm')).toString(),
    from: normalizeDateMath(rule.from ?? 'now-6m'),
    to: normalizeDateMath(rule.to ?? 'now'),
    max_signals: rule.max_signals ?? DEFAULT_MAX_SIGNALS,
    timestamp_override_fallback_disabled: rule.timestamp_override_fallback_disabled ?? false,
  };
};

const normalizeTypeSpecificFields = (rule: TypeSpecificResponse) => {
  switch (rule.type) {
    case 'query': {
      return {
        type: rule.type,
        language: rule.language ?? 'kuery',
        index: rule.index,
        data_view_id: rule.data_view_id,
        query: normalizeQueryField(rule.query) ?? '',
        filters: normalizeFilterArray(rule.filters),
        saved_id: rule.saved_id,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'saved_query': {
      return {
        type: rule.type,
        language: rule.language ?? 'kuery',
        index: rule.index,
        query: rule.query,
        filters: normalizeFilterArray(rule.filters),
        saved_id: rule.saved_id,
        data_view_id: rule.data_view_id,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'eql': {
      return {
        type: rule.type,
        language: rule.language,
        index: rule.index,
        data_view_id: rule.data_view_id,
        query: rule.query,
        filters: normalizeFilterArray(rule.filters),
        timestamp_field: rule.timestamp_field,
        event_category_override: rule.event_category_override,
        tiebreaker_field: rule.tiebreaker_field,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'esql': {
      return {
        type: rule.type,
        language: rule.language,
        query: rule.query,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'threat_match': {
      return {
        type: rule.type,
        language: rule.language ?? 'kuery',
        index: rule.index,
        data_view_id: rule.data_view_id,
        query: normalizeQueryField(rule.query),
        filters: normalizeFilterArray(rule.filters),
        saved_id: rule.saved_id,
        threat_filters: rule.threat_filters,
        threat_query: rule.threat_query,
        threat_mapping: rule.threat_mapping,
        threat_language: rule.threat_language,
        threat_index: rule.threat_index,
        threat_indicator_path: rule.threat_indicator_path,
        concurrent_searches: rule.concurrent_searches,
        items_per_search: rule.items_per_search,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'threshold': {
      return {
        type: rule.type,
        language: rule.language ?? 'kuery',
        index: rule.index,
        data_view_id: rule.data_view_id,
        query: normalizeQueryField(rule.query),
        filters: normalizeFilterArray(rule.filters),
        saved_id: rule.saved_id,
        threshold: normalizeRuleThreshold(rule.threshold),
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'machine_learning': {
      return {
        type: rule.type,
        anomaly_threshold: rule.anomaly_threshold,
        machine_learning_job_id: rule.machine_learning_job_id,
        alert_suppression: rule.alert_suppression,
      };
    }
    case 'new_terms': {
      return {
        type: rule.type,
        query: normalizeQueryField(rule.query),
        new_terms_fields: rule.new_terms_fields,
        history_window_start: rule.history_window_start,
        index: rule.index,
        filters: normalizeFilterArray(rule.filters),
        language: rule.language ?? 'kuery',
        data_view_id: rule.data_view_id,
        alert_suppression: rule.alert_suppression,
      };
    }
    default: {
      return assertUnreachable(rule);
    }
  }
};
