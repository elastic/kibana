/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generationsAreRepeating } from '.';

describe('getIsGenerationRepeating', () => {
  it('returns true when all previous generations are the same as the current generation', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: ['gen1', 'gen1', 'gen1'], // <-- all the same, length 3
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(true);
  });

  it('returns false when some of the previous generations are NOT the same as the current generation', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: ['gen1', 'gen2', 'gen1'], // <-- some are different, length 3
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(false);
  });

  it('returns true when all *sampled* generations are the same as the current generation, and there are older samples past the last N', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: [
        'gen2', // <-- older sample will be ignored
        'gen1',
        'gen1',
        'gen1',
      ],
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(true);
  });

  it('returns false when some of the *sampled* generations are NOT the same as the current generation, and there are additional samples past the last N', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: [
        'gen1', // <-- older sample will be ignored
        'gen1',
        'gen1',
        'gen2',
      ],
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(false);
  });

  it('returns false when sampling fewer generations than sampleLastNGenerations, and all are the same as the current generation', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: ['gen1', 'gen1'], // <-- same, but only 2 generations
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(false);
  });

  it('returns false when sampling fewer generations than sampleLastNGenerations, and some are different from the current generation', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: ['gen1', 'gen2'], // <-- different, but only 2 generations
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(false);
  });

  it('returns false when there are no previous generations to sample', () => {
    const result = generationsAreRepeating({
      currentGeneration: 'gen1',
      previousGenerations: [],
      sampleLastNGenerations: 3,
    });

    expect(result).toBe(false);
  });
});
