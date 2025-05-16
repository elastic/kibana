/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSuppressionUsage, RuleMetric, FeatureTypeUsage } from '../types';

export interface UpdateAlertSuppressionUsage {
  detectionRuleMetric: RuleMetric;
  usage: FeatureTypeUsage;
}

export const updateAlertSuppressionUsage = ({
  detectionRuleMetric,
  usage,
}: UpdateAlertSuppressionUsage): AlertSuppressionUsage => {
  const isAlertSuppressionConfigured =
    detectionRuleMetric.has_alert_suppression_per_rule_execution ||
    detectionRuleMetric.has_alert_suppression_per_time_period;

  // if rule does not have suppression configuration alert suppression usage
  // returned unchanged
  if (!isAlertSuppressionConfigured) {
    return usage.alert_suppression;
  }

  return {
    enabled: detectionRuleMetric.enabled
      ? usage.alert_suppression.enabled + 1
      : usage.alert_suppression.enabled,
    disabled: !detectionRuleMetric.enabled
      ? usage.alert_suppression.disabled + 1
      : usage.alert_suppression.disabled,
    suppressed_fields_count: {
      one:
        detectionRuleMetric.alert_suppression_fields_count === 1
          ? usage.alert_suppression.suppressed_fields_count.one + 1
          : usage.alert_suppression.suppressed_fields_count.one,
      two:
        detectionRuleMetric.alert_suppression_fields_count === 2
          ? usage.alert_suppression.suppressed_fields_count.two + 1
          : usage.alert_suppression.suppressed_fields_count.two,
      three:
        detectionRuleMetric.alert_suppression_fields_count === 3
          ? usage.alert_suppression.suppressed_fields_count.three + 1
          : usage.alert_suppression.suppressed_fields_count.three,
    },
    suppressed_per_time_period: detectionRuleMetric.has_alert_suppression_per_time_period
      ? usage.alert_suppression.suppressed_per_time_period + 1
      : usage.alert_suppression.suppressed_per_time_period,
    suppressed_per_rule_execution: detectionRuleMetric.has_alert_suppression_per_rule_execution
      ? usage.alert_suppression.suppressed_per_rule_execution + 1
      : usage.alert_suppression.suppressed_per_rule_execution,
    suppresses_missing_fields:
      !detectionRuleMetric.has_alert_suppression_missing_fields_strategy_do_not_suppress
        ? usage.alert_suppression.suppresses_missing_fields + 1
        : usage.alert_suppression.suppresses_missing_fields,
    does_not_suppress_missing_fields:
      detectionRuleMetric.has_alert_suppression_missing_fields_strategy_do_not_suppress
        ? usage.alert_suppression.does_not_suppress_missing_fields + 1
        : usage.alert_suppression.does_not_suppress_missing_fields,
  };
};
