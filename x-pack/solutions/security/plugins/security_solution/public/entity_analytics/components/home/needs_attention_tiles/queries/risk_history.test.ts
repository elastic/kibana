/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_MOVER_MIN_SCORE_CHANGE } from './risk_history';

describe('risk_history constants', () => {
  it('makes a Risk movers entity one whose score rose by 10 points or more', () => {
    // The rule the tile's wording states. Everything that applies it reads this one constant, so
    // changing it is a product decision: this test is there to make that change deliberate.
    expect(RISK_MOVER_MIN_SCORE_CHANGE).toBe(10);
  });
});
