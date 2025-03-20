/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState } from '../../../../types';
import { discardPreviousRefinements } from '.';

const mockUnrefinedResults = [
  {
    group: 'test-group-1',
    events: [
      {
        id: 'event-1',
        endpointId: 'endpoint-1',
        value: 'event value 1',
      },
    ],
  },
  {
    group: 'test-group-2',
    events: [
      {
        id: 'event-2',
        endpointId: 'endpoint-2',
        value: 'event value 2',
      },
    ],
  },
];

const initialState: GraphState = {
  insights: null,
  prompt: 'initial prompt',
  anonymizedEvents: [],
  combinedGenerations: 'generation1generation2',
  combinedRefinements: 'refinement1',
  errors: [],
  generationAttempts: 3,
  generations: ['generation1', 'generation2'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: ['refinement1'],
  refinePrompt: 'refinePrompt',
  replacements: {},
  unrefinedResults: mockUnrefinedResults,
  continuePrompt: 'continuePrompt',
};

describe('discardPreviousRefinements', () => {
  let result: GraphState;

  beforeEach(() => {
    result = discardPreviousRefinements({
      generationAttempts: initialState.generationAttempts,
      hallucinationFailures: initialState.hallucinationFailures,
      isHallucinationDetected: false,
      state: initialState,
    });
  });

  it('resets the combined refinements', () => {
    expect(result.combinedRefinements).toBe('');
  });

  it('increments the generation attempts', () => {
    expect(result.generationAttempts).toBe(initialState.generationAttempts + 1);
  });

  it('resets the refinements', () => {
    expect(result.refinements).toEqual([]);
  });

  describe('hallucination scenarios', () => {
    it('increments hallucination failures when hallucinations are detected', () => {
      const hallucinationResult = discardPreviousRefinements({
        generationAttempts: initialState.generationAttempts,
        hallucinationFailures: initialState.hallucinationFailures,
        isHallucinationDetected: true,
        state: initialState,
      });

      expect(hallucinationResult.hallucinationFailures).toBe(
        initialState.hallucinationFailures + 1
      );
    });

    it('does NOT increment hallucination failures when hallucinations are NOT detected', () => {
      const noHallucinationResult = discardPreviousRefinements({
        generationAttempts: initialState.generationAttempts,
        hallucinationFailures: initialState.hallucinationFailures,
        isHallucinationDetected: false,
        state: initialState,
      });

      expect(noHallucinationResult.hallucinationFailures).toBe(initialState.hallucinationFailures);
    });
  });
});
