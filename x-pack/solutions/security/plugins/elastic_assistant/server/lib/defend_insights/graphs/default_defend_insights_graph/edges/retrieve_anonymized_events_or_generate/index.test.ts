/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Document } from '@langchain/core/documents';

import { getRetrieveAnonymizedEventsOrGenerateEdge } from '.';
import type { GraphState } from '../../types';

const logger = loggerMock.create();

const mockDocument: Document = {
  metadata: {},
  pageContent:
    '@timestamp,2024-10-10T21:01:24.148Z\n' +
    '_id,e809ffc5e0c2e731c1f146e0f74250078136a87574534bf8e9ee55445894f7fc\n' +
    'host.name,e1cb3cf0-30f3-4f99-a9c8-518b955c6f90\n' +
    'user.name,039c15c5-3964-43e7-a891-42fe2ceeb9ff',
};

const initialGraphState: GraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedEvents: [],
  combinedGenerations: '',
  combinedRefinements: '',
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

describe('getRetrieveAnonymizedEventsOrGenerateEdge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns "generate" when anonymizedEvents is NOT empty', () => {
    const state: GraphState = {
      ...initialGraphState,
      anonymizedEvents: [mockDocument],
    };

    const edge = getRetrieveAnonymizedEventsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('generate');
  });

  it('returns "retrieve_anonymized_events" when anonymizedEvents is empty', () => {
    const state: GraphState = {
      ...initialGraphState,
      anonymizedEvents: [], // <-- empty
    };

    const edge = getRetrieveAnonymizedEventsOrGenerateEdge(logger);
    const result = edge(state);

    expect(result).toEqual('retrieve_anonymized_events');
  });
});
