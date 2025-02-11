/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { getGenerateOrEndEdge } from '.';
import type { GraphState } from '../../types';

const logger = loggerMock.create();

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
  combinedGenerations: 'generations',
  combinedRefinements: 'refinements',
  continuePrompt: 'continue',
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 10,
  refinements: [],
  refinePrompt: 'refinePrompt',
  replacements: {},
  unrefinedResults: null,
};

describe('getGenerateOrEndEdge', () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 'end' when there are zero alerts", () => {
    const state: GraphState = {
      ...graphState,
      anonymizedAlerts: [], // <-- zero alerts
    };

    const edge = getGenerateOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'generate' when there are alerts", () => {
    const edge = getGenerateOrEndEdge(logger);
    const result = edge(graphState);

    expect(result).toEqual('generate');
  });
});
