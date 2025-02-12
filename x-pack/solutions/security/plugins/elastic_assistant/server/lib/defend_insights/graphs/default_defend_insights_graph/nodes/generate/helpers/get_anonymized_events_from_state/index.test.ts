/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphState } from '../../../../types';
import { mockAnonymizedEvents } from '../../../../mock/mock_anonymized_events';
import { getAnonymizedEventsFromState } from '.';

const graphState: GraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedEvents: mockAnonymizedEvents,
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

describe('getAnonymizedEventsFromState', () => {
  it('returns the anonymized events from the state', () => {
    const result = getAnonymizedEventsFromState(graphState);

    expect(result).toEqual([
      mockAnonymizedEvents[0].pageContent,
      mockAnonymizedEvents[1].pageContent,
    ]);
  });
});
