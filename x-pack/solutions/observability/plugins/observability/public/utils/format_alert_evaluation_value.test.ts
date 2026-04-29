/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAlertEvaluationValue } from './format_alert_evaluation_value';

describe('formatAlertEvaluationValue', () => {
  it('returns - when there is no evaluationValue passed', () => {
    expect(formatAlertEvaluationValue('apm.transaction_error_rate', undefined)).toBe('-');
  });
  it('returns - when there is null evaluationValue passed', () => {
    // @ts-expect-error
    expect(formatAlertEvaluationValue('apm.transaction_error_rate', null)).toBe('-');
  });
  it('returns the evaluation value when the value is 0', () => {
    expect(formatAlertEvaluationValue('.es-query', 0)).toBe(0);
  });
  it('returns the evaluation value when ruleTypeId in unknown aka unformatted', () => {
    expect(formatAlertEvaluationValue('unknown.rule.type', 2000)).toBe(2000);
  });
  it('returns the evaluation value formatted as percent when the alert rule type is "apm.transaction_error_rate" ', () => {
    expect(formatAlertEvaluationValue('apm.transaction_error_rate', 20)).toBe('20%');
  });
  it('returns the evaluation value formatted as duration in ms when the alert rule type is "apm.transaction_duration" ', () => {
    expect(formatAlertEvaluationValue('apm.transaction_duration', 140000)).toBe('140 ms');
  });
});
