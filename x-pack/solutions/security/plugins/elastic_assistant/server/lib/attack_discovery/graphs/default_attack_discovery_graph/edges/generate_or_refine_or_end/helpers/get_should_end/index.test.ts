/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getShouldEnd } from '.';

describe('getShouldEnd', () => {
  it('returns true if hasZeroAlerts is true', () => {
    const result = getShouldEnd({
      hasZeroAlerts: true, // <-- true
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toBe(true);
  });

  it('returns true if maxHallucinationFailuresReached is true', () => {
    const result = getShouldEnd({
      hasZeroAlerts: false,
      maxHallucinationFailuresReached: true, // <-- true
      maxRetriesReached: false,
    });

    expect(result).toBe(true);
  });

  it('returns true if maxRetriesReached is true', () => {
    const result = getShouldEnd({
      hasZeroAlerts: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: true, // <-- true
    });

    expect(result).toBe(true);
  });

  it('returns false if all conditions are false', () => {
    const result = getShouldEnd({
      hasZeroAlerts: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toBe(false);
  });

  it('returns true if all conditions are true', () => {
    const result = getShouldEnd({
      hasZeroAlerts: true,
      maxHallucinationFailuresReached: true,
      maxRetriesReached: true,
    });

    expect(result).toBe(true);
  });
});
