/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Document } from '@langchain/core/documents';
import type { DefendInsight } from '@kbn/elastic-assistant-common';

import { getRefineOrEndEdge } from '.';
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

const mockDefendInsight: DefendInsight = {
  group: 'test-group',
  events: [
    {
      id: 'test-id',
      endpointId: 'test-endpoint',
      value: 'test-value',
    },
  ],
};

const initialGraphState: GraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedEvents: [mockDocument],
  combinedGenerations: 'generations',
  combinedRefinements: '',
  errors: [],
  generationAttempts: 2,
  generations: ['gen', 'erations'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: 'refinePrompt',
  replacements: {},
  unrefinedResults: [mockDefendInsight],
};

describe('getRefineOrEndEdge', () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 'end' when there are final results", () => {
    const state: GraphState = {
      ...initialGraphState,
      insights: [mockDefendInsight], // Has final results
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'refine' when there are no final results and no limits reached", () => {
    const state: GraphState = {
      ...initialGraphState,
      insights: null, // No final results
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('refine');
  });

  it("returns 'end' when max generation attempts limit is reached", () => {
    const state: GraphState = {
      ...initialGraphState,
      insights: null,
      generationAttempts: initialGraphState.maxGenerationAttempts,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'end' when max hallucination failures limit is reached", () => {
    const state: GraphState = {
      ...initialGraphState,
      insights: null,
      hallucinationFailures: initialGraphState.maxHallucinationFailures,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'end' when multiple limits are reached", () => {
    const state: GraphState = {
      ...initialGraphState,
      insights: null,
      generationAttempts: initialGraphState.maxGenerationAttempts,
      hallucinationFailures: initialGraphState.maxHallucinationFailures,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });
});
