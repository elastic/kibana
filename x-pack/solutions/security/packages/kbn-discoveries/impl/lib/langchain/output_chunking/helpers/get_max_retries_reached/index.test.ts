/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxRetriesReached } from '.';

describe('getMaxRetriesReached', () => {
  it('returns true when generation attempts is equal to the max generation attempts', () => {
    expect(getMaxRetriesReached({ generationAttempts: 2, maxGenerationAttempts: 2 })).toBe(true);
  });

  it('returns true when generation attempts is greater than the max generation attempts', () => {
    expect(getMaxRetriesReached({ generationAttempts: 3, maxGenerationAttempts: 2 })).toBe(true);
  });

  it('returns false when generation attempts is less than the max generation attempts', () => {
    expect(getMaxRetriesReached({ generationAttempts: 1, maxGenerationAttempts: 2 })).toBe(false);
  });
});
