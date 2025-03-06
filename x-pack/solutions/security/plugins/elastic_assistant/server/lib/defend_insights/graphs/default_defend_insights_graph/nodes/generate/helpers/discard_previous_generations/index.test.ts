/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discardPreviousGenerations } from '.';
import { GraphState } from '../../../../types';

const graphState: GraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedEvents: [
    {
      metadata: {},
      pageContent: `_id,event-id1
agent.id,agent-id1
process.executable,some/file/path.exe`,
    },
    {
      metadata: {},
      pageContent: `_id,event-id2
agent.id,agent-id2
process.executable,another/file/path.exe`,
    },
  ],
  combinedGenerations: 'combinedGenerations',
  combinedRefinements: '',
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
