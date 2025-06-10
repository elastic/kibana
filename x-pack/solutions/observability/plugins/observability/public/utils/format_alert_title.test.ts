/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertTitle } from './format_alert_title';

describe('getAlertTitle', () => {
  it('returns the alert title when rule type is "Custom threshold"', () => {
    expect(getAlertTitle('Custom threshold')).toBe('Custom threshold breached');
  });
  it('returns the alert title when rule type is "Latency threshold"', () => {
    expect(getAlertTitle('Latency threshold')).toBe('Latency threshold breached');
  });
  it('returns the alert title when rule type is "Failed transaction rate threshold"', () => {
    expect(getAlertTitle('Failed transaction rate threshold')).toBe(
      'Failed transaction rate threshold breached'
    );
  });
});
