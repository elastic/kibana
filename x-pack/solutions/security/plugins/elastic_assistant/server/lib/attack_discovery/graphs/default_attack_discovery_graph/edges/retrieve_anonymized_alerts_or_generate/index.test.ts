/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { getRetrieveAnonymizedAlertsOrGenerateEdge } from '.';
import { mockAnonymizedAlerts } from '../../../../evaluation/__mocks__/mock_anonymized_alerts';
import type { GraphState } from '../../types';

const logger = loggerMock.create();

const initialGraphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: 'prompt',
  anonymizedAlerts: [],
  combinedGenerations: '',
  combinedRefinements: '',
  continuePrompt: 'continue',
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: 'refinePrompt',
  replacements: {},
  unrefinedResults: null,
};

describe('getRetrieveAnonymizedAlertsOrGenerateEdge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns "generate" when anonymizedAlerts is NOT empty, so there are alerts for the generate step', () => {
    const state: GraphState = {
      ...initialGraphState,
      anonymizedAlerts: mockAnonymizedAlerts,
    };

    const edge = getRetrieveAnonymizedAlertsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('generate');
  });

  it('returns "retrieve_anonymized_alerts" when anonymizedAlerts is empty, so they can be retrieved', () => {
    const state: GraphState = {
      ...initialGraphState,
      anonymizedAlerts: [], // <-- empty
    };

    const edge = getRetrieveAnonymizedAlertsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('retrieve_anonymized_alerts');
  });
});
