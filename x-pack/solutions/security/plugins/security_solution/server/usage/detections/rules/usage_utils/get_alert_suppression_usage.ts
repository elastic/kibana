/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSearchResult } from '../../../types';

export const getAlertSuppressionUsage = (
  ruleAttributes: RuleSearchResult
): {
  hasAlertSuppressionPerRuleExecution: boolean;
  hasAlertSuppressionPerTimePeriod: boolean;
  hasAlertSuppressionMissingFieldsStrategyDoNotSuppress: boolean;
  alertSuppressionFieldsCount: number;
} => {
  if (ruleAttributes.params.alertSuppression == null) {
    return {
      hasAlertSuppressionPerRuleExecution: false,
      hasAlertSuppressionPerTimePeriod: false,
      hasAlertSuppressionMissingFieldsStrategyDoNotSuppress: false,
      alertSuppressionFieldsCount: 0,
    };
  }

  switch (ruleAttributes.params.type) {
    case 'threshold':
      return {
        hasAlertSuppressionPerRuleExecution: false,
        hasAlertSuppressionPerTimePeriod: true,
        hasAlertSuppressionMissingFieldsStrategyDoNotSuppress: false,
        alertSuppressionFieldsCount: ruleAttributes.params?.threshold?.field?.length || 0,
      };
    case 'query':
    case 'saved_query':
    case 'new_terms':
    case 'threat_match':
    case 'machine_learning':
    case 'esql':
    case 'eql':
      return {
        hasAlertSuppressionPerRuleExecution:
          ruleAttributes.params.alertSuppression.duration == null,
        hasAlertSuppressionPerTimePeriod: ruleAttributes.params.alertSuppression.duration != null,
        hasAlertSuppressionMissingFieldsStrategyDoNotSuppress:
          ruleAttributes.params.alertSuppression.missingFieldsStrategy === 'doNotSuppress',
        alertSuppressionFieldsCount: ruleAttributes.params.alertSuppression.groupBy?.length || 0,
      };
    default:
      return {
        hasAlertSuppressionPerRuleExecution: false,
        hasAlertSuppressionPerTimePeriod: false,
        hasAlertSuppressionMissingFieldsStrategyDoNotSuppress: false,
        alertSuppressionFieldsCount: 0,
      };
  }
};
