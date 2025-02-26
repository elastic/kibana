/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDefendInsights } from '../../../../mock/mock_defend_insights';
import { getUseUnrefinedResults } from '.';

describe('getUseUnrefinedResults', () => {
  it('returns true when the next attempt would exceed the limit, and we have unrefined results', () => {
    expect(
      getUseUnrefinedResults({
        generationAttempts: 2,
        maxGenerationAttempts: 3,
        unrefinedResults: mockDefendInsights,
      })
    ).toBe(true);
  });

  it('returns false when the next attempt would NOT exceed the limit', () => {
    expect(
      getUseUnrefinedResults({
        generationAttempts: 1,
        maxGenerationAttempts: 3,
        unrefinedResults: mockDefendInsights,
      })
    ).toBe(false);
  });

  it('returns false when unrefined results is null', () => {
    expect(
      getUseUnrefinedResults({
        generationAttempts: 2,
        maxGenerationAttempts: 3,
        unrefinedResults: null,
      })
    ).toBe(false);
  });

  it('returns false when unrefined results is empty', () => {
    expect(
      getUseUnrefinedResults({
        generationAttempts: 2,
        maxGenerationAttempts: 3,
        unrefinedResults: [],
      })
    ).toBe(false);
  });
});
