/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUseUnrefinedResults } from '.';

describe('getUseUnrefinedResults', () => {
  it('returns true if both maxHallucinationFailuresReached and maxRetriesReached are true', () => {
    const result = getUseUnrefinedResults({
      maxHallucinationFailuresReached: true,
      maxRetriesReached: true,
    });

    expect(result).toBe(true);
  });

  it('returns true if maxHallucinationFailuresReached is true and maxRetriesReached is false', () => {
    const result = getUseUnrefinedResults({
      maxHallucinationFailuresReached: true,
      maxRetriesReached: false,
    });

    expect(result).toBe(true);
  });

  it('returns true if maxHallucinationFailuresReached is false and maxRetriesReached is true', () => {
    const result = getUseUnrefinedResults({
      maxHallucinationFailuresReached: false,
      maxRetriesReached: true,
    });

    expect(result).toBe(true);
  });

  it('returns false if both maxHallucinationFailuresReached and maxRetriesReached are false', () => {
    const result = getUseUnrefinedResults({
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toBe(false);
  });
});
