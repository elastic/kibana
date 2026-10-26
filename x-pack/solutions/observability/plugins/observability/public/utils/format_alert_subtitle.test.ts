/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertSubtitle } from './format_alert_subtitle';

describe('getAlertSubtitle', () => {
  it('returns the alert subtitle when rule type is "Custom threshold"', () => {
    expect(getAlertSubtitle('Custom threshold')).toBe('Custom threshold breached');
  });
  it('returns the alert subtitle when rule type is "Latency threshold"', () => {
    expect(getAlertSubtitle('Latency threshold')).toBe('Latency threshold breached');
  });
  it('returns the alert subtitle when rule type is "Failed transaction rate threshold"', () => {
    expect(getAlertSubtitle('Failed transaction rate threshold')).toBe(
      'Failed transaction rate threshold breached'
    );
  });
});
