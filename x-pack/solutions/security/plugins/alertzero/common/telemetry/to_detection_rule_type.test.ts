/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_RULE_TYPES } from './constants';
import { toDetectionRuleType } from './to_detection_rule_type';

describe('toDetectionRuleType', () => {
  it.each([
    ['machine_learning', 'ml'],
    ['saved_query', 'query'],
    ['a_rule_type_added_later', 'other'],
  ])('maps %s to %s', (ruleType, expected) => {
    expect(toDetectionRuleType(ruleType)).toBe(expected);
  });

  it.each(DETECTION_RULE_TYPES.map((ruleType) => [ruleType]))(
    'keeps %s, which is already in the vocabulary',
    (ruleType) => {
      expect(toDetectionRuleType(ruleType)).toBe(ruleType);
    }
  );

  it.each([[''], [null]])(
    'treats %p, which Liquid renders for a missing value, as absent',
    (value) => {
      expect(toDetectionRuleType(value)).toBeUndefined();
    }
  );

  it('leaves a non-string for the schema to reject', () => {
    expect(toDetectionRuleType(42)).toBe(42);
  });
});
