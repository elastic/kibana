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
  SharedResponseProps,
  TypeSpecificResponse,
} from '../../../api/detection_engine/model/rule_schema';
import { addEcsToRequiredFields } from '../../rule_management/utils';
import {
  normalizeThreatArray,
  normalizeRuleThreshold,
  normalizeFilterArray,
  normalizeQueryField,
} from './normalizers';

export const normalizeRuleResponse = (rule: RuleResponse): RuleResponse => {
  const typeSpecificFields = normalizeTypeSpecificFields(rule);
  const commonFields = normalizeCommonResponseFields(rule);

  // Needed to correctly narrow typescript types, we add in the correctly typed alert suppression field in the type-specific normalization
  const { alert_suppression: unUsedField, ...existingRule } = rule;

  return {
    ...existingRule,
    ...commonFields,
    ...typeSpecificFields,
  };
};

const normalizeCommonResponseFields = (rule: RuleResponse): SharedResponseProps => {
  return {
    name: rule.name?.trim(),
    description: rule.description,
    risk_score: rule.risk_score,
    severity: rule.severity,
    version: rule.version,
    enabled: rule.enabled,
    exceptions_list: rule.exceptions_list,
    actions: rule.actions,
    author: rule.author,
    tags: rule.tags ?? [],
    severity_mapping: rule.severity_mapping ?? [],
    risk_score_mapping: rule.risk_score_mapping?.map((mapping) => requiredOptional(mapping)) ?? [],
    references: rule.references ?? [],
    false_positives: rule.false_positives ?? [],
    threat: normalizeThreatArray(rule.threat),
    note: rule.note ?? '',
    setup: rule.setup ?? '',
    related_integrations: rule.related_integrations ?? [],
    required_fields: addEcsToRequiredFields(rule.required_fields),
    interval: (TimeDuration.parse(rule.interval) ?? new TimeDuration(5, 'm')).toString(),
    from: normalizeDateMath(rule.from ?? 'now-6m'),
    to: normalizeDateMath(rule.to ?? 'now'),
    max_signals: rule.max_signals ?? DEFAULT_MAX_SIGNALS,
    timestamp_override_fallback_disabled: rule.timestamp_override_fallback_disabled ?? false,
    id: rule.id,
    rule_id: rule.rule_id,
    rule_source: rule.rule_source,
    immutable: rule.immutable,
    created_at: rule.created_at,
    created_by: rule.created_by,
    updated_at: rule.updated_at,
    updated_by: rule.updated_by,
    revision: rule.revision,
  };
};

const normalizeTypeSpecificFields = (rule: RuleResponse): TypeSpecificResponse => {
  switch (rule.type) {
    case 'query': {
      return {
        type: rule.type,
        language: rule.language ?? 'kuery',
        index: rule.index,
        data_view_id: rule.data_view_id,
        query: normalizeQueryField(rule.query),
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
        query: normalizeQueryField(rule.query),
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
        query: normalizeQueryField(rule.query),
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
        query: normalizeQueryField(rule.query),
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
        threat_query: normalizeQueryField(rule.threat_query),
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
