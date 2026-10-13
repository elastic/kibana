/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { severityOf } from './attack_discoveries';

describe('severityOf', () => {
  // A discovery's risk score is the sum of its alerts' scores.
  it.each([
    [150, 3, 'medium'],
    [21, 1, 'low'],
    [219, 3, 'high'],
    [297, 3, 'critical'],
    [400, 10, 'low'],
  ])('a total of %d over %d alerts is %s', (riskScore, alertCount, severity) => {
    expect(severityOf(riskScore, alertCount)).toBe(severity);
  });
});
