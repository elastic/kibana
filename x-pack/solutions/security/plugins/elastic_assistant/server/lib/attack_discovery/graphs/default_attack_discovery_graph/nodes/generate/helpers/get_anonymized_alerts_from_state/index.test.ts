/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnonymizedAlertsFromState } from '.';

import { mockAnonymizedAlerts } from '../../../../../../evaluation/__mocks__/mock_anonymized_alerts';
import { GraphState } from '../../../../types';

const graphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: 'prompt',
  anonymizedAlerts: mockAnonymizedAlerts, // <-- mockAnonymizedAlerts is an array of objects with a pageContent property
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

describe('getAnonymizedAlertsFromState', () => {
  it('returns the anonymized alerts from the state', () => {
    const result = getAnonymizedAlertsFromState(graphState);

    expect(result).toEqual([
      mockAnonymizedAlerts[0].pageContent,
      mockAnonymizedAlerts[1].pageContent,
    ]);
  });
});
