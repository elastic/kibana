/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERT_SAMPLE_SIZE, RIEMANN_ZETA_VALUE } from './constants';

describe('risk scoring constants', () => {
  it('normalizes by the zeta partial sum over the default alert sample size', () => {
    expect(DEFAULT_ALERT_SAMPLE_SIZE).toBe(500);
    expect(RIEMANN_ZETA_VALUE).toBeCloseTo(2.522977328584379, 12);
  });
});
