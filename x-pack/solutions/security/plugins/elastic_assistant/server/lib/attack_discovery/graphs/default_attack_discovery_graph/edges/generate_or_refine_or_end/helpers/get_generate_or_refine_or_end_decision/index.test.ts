/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenerateOrRefineOrEndDecision } from '.';

describe('getGenerateOrRefineOrEndDecision', () => {
  it("returns 'end' if getShouldEnd returns true", () => {
    const result = getGenerateOrRefineOrEndDecision({
      hasUnrefinedResults: false,
      hasZeroAlerts: true,
      maxHallucinationFailuresReached: true,
      maxRetriesReached: true,
    });

    expect(result).toEqual('end');
  });

  it("returns 'refine' if hasUnrefinedResults is true and getShouldEnd returns false", () => {
    const result = getGenerateOrRefineOrEndDecision({
      hasUnrefinedResults: true,
      hasZeroAlerts: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('refine');
  });

  it("returns 'generate' if hasUnrefinedResults is false and getShouldEnd returns false", () => {
    const result = getGenerateOrRefineOrEndDecision({
      hasUnrefinedResults: false,
      hasZeroAlerts: false,
      maxHallucinationFailuresReached: false,
      maxRetriesReached: false,
    });

    expect(result).toEqual('generate');
  });
});
