/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { DataViewSpec } from '@kbn/response-ops-rule-params/common';

const SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS = [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID] as const;

type SuggestedDashboardsValidRuleTypeIds =
  (typeof SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS)[number];

export const isSuggestedDashboardsValidRuleTypeId = (
  ruleTypeId?: string
): ruleTypeId is SuggestedDashboardsValidRuleTypeIds => {
  return (
    ruleTypeId !== undefined &&
    Object.values<string>(SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS).includes(ruleTypeId)
  );
};

// TS will make sure that if we add a new supported rule type id we had the corresponding function to get the relevant rule fields
export const getRelevantRuleFieldsMap: Record<
  SuggestedDashboardsValidRuleTypeIds,
  (ruleParams: { [key: string]: unknown }) => Set<string>
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: (customThresholdParams) => {
    const relevantFields = new Set<string>();
    const metrics = (customThresholdParams as CustomThresholdParams).criteria[0].metrics;
    metrics.forEach((metric) => {
      relevantFields.add(metric.field);
    });
    return relevantFields;
  },
};

export const getRuleQueryIndexMap: Record<
  SuggestedDashboardsValidRuleTypeIds,
  (ruleParams: { [key: string]: unknown }) => string | null
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: (customThresholdParams) => {
    const {
      searchConfiguration: { index },
    } = customThresholdParams as CustomThresholdParams;
    if (typeof index === 'object') return (index as DataViewSpec)?.id || null;
    if (typeof index === 'string') return index;
    return null;
  },
};
