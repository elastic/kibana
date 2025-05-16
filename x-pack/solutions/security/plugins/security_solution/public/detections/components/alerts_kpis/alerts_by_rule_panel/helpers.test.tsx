/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsRuleData, getIsAlertsByRuleData, getIsAlertsByRuleAgg } from './helpers';
import * as mockRule from './mock_rule_data';
import type { AlertsByRuleAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse alerts by rule data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsRuleData(
      mockRule.mockAlertsData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual(mockRule.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsRuleData(
      mockRule.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual([]);
  });
});

describe('get is alerts by rule data', () => {
  test('should return true for rule data', () => {
    expect(getIsAlertsByRuleData(mockRule.parsedAlerts)).toBe(true);
  });

  test('should return false for non rule data', () => {
    expect(getIsAlertsByRuleData([{ key: 'low', value: 1 }])).toBe(false);
  });

  test('should return false for empty array', () => {
    expect(getIsAlertsByRuleData([])).toBe(false);
  });
});

describe('get is alerts by rule agg', () => {
  test('return true for rule aggregation query', () => {
    expect(getIsAlertsByRuleAgg(mockRule.mockAlertsData)).toBe(true);
  });

  test('return false for queries without alertByRule key', () => {
    expect(getIsAlertsByRuleAgg({ ...mockRule.mockAlertsEmptyData, aggregations: {} })).toBe(false);
  });
});
