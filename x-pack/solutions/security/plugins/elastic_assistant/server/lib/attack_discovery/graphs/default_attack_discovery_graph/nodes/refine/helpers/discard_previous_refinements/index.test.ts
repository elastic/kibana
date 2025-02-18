/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discardPreviousRefinements } from '.';
import { mockAttackDiscoveries } from '../../../../../../evaluation/__mocks__/mock_attack_discoveries';
import { GraphState } from '../../../../types';

const initialState: GraphState = {
  anonymizedAlerts: [],
  attackDiscoveries: null,
  attackDiscoveryPrompt: 'attackDiscoveryPrompt',
  combinedGenerations: 'generation1generation2',
  combinedRefinements: 'refinement1', // <-- existing refinements
  continuePrompt: 'continue',
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
  unrefinedResults: [...mockAttackDiscoveries],
};

describe('discardPreviousRefinements', () => {
  describe('common state updates', () => {
    let result: GraphState;

    beforeEach(() => {
      result = discardPreviousRefinements({
        generationAttempts: initialState.generationAttempts,
        hallucinationFailures: initialState.hallucinationFailures,
        isHallucinationDetected: true,
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

    it('increments the hallucination failures when hallucinations are detected', () => {
      expect(result.hallucinationFailures).toBe(initialState.hallucinationFailures + 1);
    });
  });

  it('increments the hallucination failures when hallucinations are detected', () => {
    const result = discardPreviousRefinements({
      generationAttempts: initialState.generationAttempts,
      hallucinationFailures: initialState.hallucinationFailures,
      isHallucinationDetected: true, // <-- hallucinations detected
      state: initialState,
    });

    expect(result.hallucinationFailures).toBe(initialState.hallucinationFailures + 1);
  });

  it('does NOT increment the hallucination failures when hallucinations are NOT detected', () => {
    const result = discardPreviousRefinements({
      generationAttempts: initialState.generationAttempts,
      hallucinationFailures: initialState.hallucinationFailures,
      isHallucinationDetected: false, // <-- no hallucinations detected
      state: initialState,
    });

    expect(result.hallucinationFailures).toBe(initialState.hallucinationFailures);
  });
});
