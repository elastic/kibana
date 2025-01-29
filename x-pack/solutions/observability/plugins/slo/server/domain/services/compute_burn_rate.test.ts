/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from '../../services/fixtures/slo';
import { computeBurnRate } from './compute_burn_rate';

describe('computeBurnRate', () => {
  it('computes 0 when sliValue is 1', () => {
    const sliValue = 1;
    expect(computeBurnRate(createSLO(), sliValue)).toEqual(0);
  });

  it('computes 0 when sliValue is greater than 1', () => {
    const sliValue = 1.21;
    expect(computeBurnRate(createSLO(), sliValue)).toEqual(0);
  });

  it('computes the burn rate as 1x the error budget', () => {
    const sliValue = 0.9;
    expect(computeBurnRate(createSLO({ objective: { target: 0.9 } }), sliValue)).toEqual(1);
  });

  it('computes the burn rate as 10x the error budget', () => {
    const sliValue = 0.9;
    expect(computeBurnRate(createSLO({ objective: { target: 0.99 } }), sliValue)).toEqual(10);
  });

  it('computes the burn rate as 0.5x the error budget', () => {
    const sliValue = 0.9;
    expect(computeBurnRate(createSLO({ objective: { target: 0.8 } }), sliValue)).toEqual(0.5);
  });
});
