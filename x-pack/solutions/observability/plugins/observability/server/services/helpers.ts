/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

const SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS = [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID] as const;

export type SuggestedDashboardsValidRuleTypeIds =
  (typeof SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS)[number];

export const isSuggestedDashboardsValidRuleTypeId = (
  ruleTypeId?: string
): ruleTypeId is SuggestedDashboardsValidRuleTypeIds => {
  return (
    ruleTypeId !== undefined &&
    Object.values<string>(SUGGESTED_DASHBOARDS_VALID_RULE_TYPE_IDS).includes(ruleTypeId)
  );
};
