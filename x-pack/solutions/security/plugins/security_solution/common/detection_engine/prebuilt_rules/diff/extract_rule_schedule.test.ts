/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../api/detection_engine';
import { extractRuleSchedule } from './extract_rule_schedule';

describe('extractRuleSchedule', () => {
  it('returns rule schedule', () => {
    const ruleSchedule = extractRuleSchedule({
      from: 'now-6m',
      interval: '5m',
      to: 'now',
    } as RuleResponse);

    expect(ruleSchedule).toEqual({ interval: '5m', from: 'now-6m', to: 'now' });
  });

  it('returns default values', () => {
    const ruleSchedule = extractRuleSchedule({} as RuleResponse);

    expect(ruleSchedule).toEqual({ interval: '5m', from: 'now-6m', to: 'now' });
  });
});
