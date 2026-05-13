/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShouldEnd } from '.';

describe('getShouldEnd', () => {
  it('returns true when hasFinalResults is true', () => {
    const result = getShouldEnd({
      hasFinalResults: true,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toBe(true);
  });

  it('returns true when maxHallucinationFailuresReached is true', () => {
    const result = getShouldEnd({
      hasFinalResults: false,
      maxHallucinationFailuresReached: true,
      maxRetriesReached: false,
    });

    expect(result).toBe(true);
  });

  it('returns true when maxRetriesReached is true', () => {
    const result = getShouldEnd({
      hasFinalResults: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: true,
    });

    expect(result).toBe(true);
  });

  it('returns true when both maxHallucinationFailuresReached and maxRetriesReached are true', () => {
    const result = getShouldEnd({
      hasFinalResults: false,
      maxHallucinationFailuresReached: true, // <-- limit reached
      maxRetriesReached: true, // <-- another limit reached
    });

    expect(result).toBe(true);
  });

  it('returns false when all conditions are false', () => {
    const result = getShouldEnd({
      hasFinalResults: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toBe(false);
  });
});
