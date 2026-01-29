/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleCustomizationStatus } from './get_initial_usage';
import type { RuleCustomizationCounts } from './types';

export interface ExternalRuleSourceInfo {
  is_customized: boolean;
  customized_fields: Array<{ fieldName: string }>;
}

// we only publish a subset of most important fields that we know can be customized
// this is to avoid telemetry issues if we add new fields to the rule schema
// and to avoid counting fields of lesser importance
// see https://github.com/elastic/kibana/issues/140369 for more information
const ALLOWED_FIELDS: Set<keyof RuleCustomizationCounts> = new Set([
  'alert_suppression',
  'anomaly_threshold',
  'data_view_id',
  'description',
  'filters',
  'from',
  'index',
  'interval',
  'investigation_fields',
  'name',
  'new_terms_fields',
  'note',
  'query',
  'risk_score',
  'severity',
  'setup',
  'tags',
  'threat_query',
  'threshold',
  'timeline_id',
]);

export const getRuleCustomizationStatus = (
  ruleSources: ReadonlyArray<ExternalRuleSourceInfo>
): RuleCustomizationCounts => {
  const counts = getInitialRuleCustomizationStatus();

  ruleSources.forEach((ruleSource) => {
    if (!ruleSource.is_customized) {
      return;
    }

    ruleSource.customized_fields.forEach((field) => {
      const fieldName = field.fieldName as keyof RuleCustomizationCounts;
      if (ALLOWED_FIELDS.has(fieldName)) {
        counts[fieldName] = (counts[fieldName] ?? 0) + 1;
      }
    });
  });

  return counts;
};
