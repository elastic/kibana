/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxHallucinationFailuresReached } from '.';

describe('getMaxHallucinationFailuresReached', () => {
  it('return true when hallucination failures is equal to the max hallucination failures', () => {
    expect(
      getMaxHallucinationFailuresReached({ hallucinationFailures: 2, maxHallucinationFailures: 2 })
    ).toBe(true);
  });

  it('returns true when hallucination failures is greater than the max hallucination failures', () => {
    expect(
      getMaxHallucinationFailuresReached({ hallucinationFailures: 3, maxHallucinationFailures: 2 })
    ).toBe(true);
  });

  it('returns false when hallucination failures is less than the max hallucination failures', () => {
    expect(
      getMaxHallucinationFailuresReached({ hallucinationFailures: 1, maxHallucinationFailures: 2 })
    ).toBe(false);
  });
});
