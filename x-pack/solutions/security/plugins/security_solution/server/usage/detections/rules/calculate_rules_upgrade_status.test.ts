/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRuleUpgradeStatus } from './calculate_rules_upgrade_status';
import type { RuleMetric } from './types';

function prepareRuleMetric(isCustomized: boolean, enabled: boolean): RuleMetric {
  return {
    rule_name: 'test_rule',
    rule_id: 'test_rule_id',
    rule_type: 'query',
    rule_version: 1,
    enabled,
    elastic_rule: true,
    is_customized: isCustomized,
    created_on: '2024-01-01T00:00:00Z',
    updated_on: '2024-01-01T00:00:00Z',
    alert_count_daily: 0,
    cases_count_total: 0,
    has_legacy_notification: false,
    has_notification: false,
    has_legacy_investigation_field: false,
    has_alert_suppression_per_rule_execution: false,
    has_alert_suppression_per_time_period: false,
    has_alert_suppression_missing_fields_strategy_do_not_suppress: false,
    alert_suppression_fields_count: 0,
  };
}

describe('calculateRuleUpgradeStatus', () => {
  it('should return all zeros when given an empty array', () => {
    const result = calculateRuleUpgradeStatus([]);
    expect(result).toEqual({
      total: 0,
      customized: 0,
      enabled: 0,
      disabled: 0,
    });
  });

  it('should count total, enabled, disabled, and customized rules correctly', () => {
    const rules: RuleMetric[] = [
      prepareRuleMetric(false, false), // not customized, disabled
      prepareRuleMetric(false, true), // not customized, enabled
      prepareRuleMetric(true, false), // customized, disabled
      prepareRuleMetric(true, true), // customized, enabled
    ];
    const result = calculateRuleUpgradeStatus(rules);
    expect(result).toEqual({
      total: 4,
      customized: 2,
      enabled: 2,
      disabled: 2,
    });
  });
});
