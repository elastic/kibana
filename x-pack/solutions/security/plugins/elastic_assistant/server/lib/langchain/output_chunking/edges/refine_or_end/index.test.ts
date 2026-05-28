/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import type { AttackDiscoveryGraphState } from '../../../graphs';
import {
  mockAnonymizedAlerts,
  mockAnonymizedAlertsReplacements,
} from '../../../../attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../../attack_discovery/evaluation/__mocks__/mock_attack_discoveries';
import { getRefineOrEndEdge } from '.';

const logger = loggerMock.create();

const initialGraphState: AttackDiscoveryGraphState = {
  insights: null,
  prompt: 'prompt',
  anonymizedDocuments: [...mockAnonymizedAlerts],
  combinedGenerations: 'generations',
  combinedRefinements: '',
  continuePrompt: 'continue',
  errors: [],
  generationAttempts: 2,
  generations: ['gen', 'erations'],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: 'refinePrompt',
  replacements: {
    ...mockAnonymizedAlertsReplacements,
  },
  unrefinedResults: mockAttackDiscoveries,
};

describe('getRefineOrEndEdge', () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 'end' when the refined results were generated", () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      insights: mockAttackDiscoveries, // <-- attackDiscoveries are NOT null
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'refine' when there are unrefined results, and limits have NOT been reached", () => {
    const edge = getRefineOrEndEdge(logger);
    const result = edge(initialGraphState);

    expect(result).toEqual('refine');
  });

  it("returns 'end' when the max generation attempts limit was reached", () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      generationAttempts: initialGraphState.maxGenerationAttempts,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'end' when the max hallucination failures limit was reached", () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      hallucinationFailures: initialGraphState.maxHallucinationFailures,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });

  it("returns 'end' when multiple limits are reached", () => {
    const state: AttackDiscoveryGraphState = {
      ...initialGraphState,
      generationAttempts: initialGraphState.maxGenerationAttempts,
      hallucinationFailures: initialGraphState.maxHallucinationFailures,
    };

    const edge = getRefineOrEndEdge(logger);
    const result = edge(state);

    expect(result).toEqual('end');
  });
});
