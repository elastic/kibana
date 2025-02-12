/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discardPreviousGenerations } from '.';
import { GraphState } from '../../../../types';

const graphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: 'prompt',
  anonymizedAlerts: [
    {
      metadata: {},
      pageContent:
        '@timestamp,2024-10-10T21:01:24.148Z\n' +
        '_id,e809ffc5e0c2e731c1f146e0f74250078136a87574534bf8e9ee55445894f7fc\n' +
        'host.name,e1cb3cf0-30f3-4f99-a9c8-518b955c6f90\n' +
        'user.name,039c15c5-3964-43e7-a891-42fe2ceeb9ff',
    },
    {
      metadata: {},
      pageContent:
        '@timestamp,2024-10-10T21:01:24.148Z\n' +
        '_id,c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b\n' +
        'host.name,e1cb3cf0-30f3-4f99-a9c8-518b955c6f90\n' +
        'user.name,039c15c5-3964-43e7-a891-42fe2ceeb9ff',
    },
  ],
  combinedGenerations: 'combinedGenerations',
  combinedRefinements: '',
  continuePrompt: 'continue',
  errors: [],
  generationAttempts: 2,
  generations: ['combined', 'Generations'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: 'refinePrompt',
  replacements: {},
  unrefinedResults: null,
};

describe('discardPreviousGenerations', () => {
  describe('common state updates', () => {
    let result: GraphState;

    beforeEach(() => {
      result = discardPreviousGenerations({
        generationAttempts: graphState.generationAttempts,
        hallucinationFailures: graphState.hallucinationFailures,
        isHallucinationDetected: false,
        state: graphState,
      });
    });

    it('resets the combined generations', () => {
      expect(result.combinedGenerations).toBe('');
    });

    it('increments the generation attempts', () => {
      expect(result.generationAttempts).toBe(graphState.generationAttempts + 1);
    });

    it('resets the collection of generations', () => {
      expect(result.generations).toEqual([]);
    });
  });

  it('increments hallucinationFailures when a hallucination is detected', () => {
    const result = discardPreviousGenerations({
      generationAttempts: graphState.generationAttempts,
      hallucinationFailures: graphState.hallucinationFailures,
      isHallucinationDetected: true, // <-- hallucination detected
      state: graphState,
    });

    expect(result.hallucinationFailures).toBe(graphState.hallucinationFailures + 1);
  });

  it('does NOT increment hallucinationFailures when a hallucination is NOT detected', () => {
    const result = discardPreviousGenerations({
      generationAttempts: graphState.generationAttempts,
      hallucinationFailures: graphState.hallucinationFailures,
      isHallucinationDetected: false, // <-- no hallucination detected
      state: graphState,
    });

    expect(result.hallucinationFailures).toBe(graphState.hallucinationFailures);
  });
});
