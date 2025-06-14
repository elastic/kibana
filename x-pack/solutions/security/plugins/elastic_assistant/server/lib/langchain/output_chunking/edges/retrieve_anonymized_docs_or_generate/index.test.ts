/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import type { AttackDiscoveryGraphState } from '../../../graphs';
import { mockAnonymizedAlerts } from '../../../../attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { getRetrieveAnonymizedDocsOrGenerateEdge } from '.';

const logger = loggerMock.create();

const initialGraphState: AttackDiscoveryGraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedDocuments: [],
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

  it('returns "generate" when anonymizedDocs is NOT empty, so there are alerts for the generate step', () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      anonymizedDocuments: mockAnonymizedAlerts,
    };

    const edge = getRetrieveAnonymizedDocsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('generate');
  });

  it('returns "retrieve_anonymized_docs" when anonymizedDocs is empty, so they can be retrieved', () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      anonymizedDocuments: [],
    };

    const edge = getRetrieveAnonymizedDocsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('retrieve_anonymized_docs');
  });
});
