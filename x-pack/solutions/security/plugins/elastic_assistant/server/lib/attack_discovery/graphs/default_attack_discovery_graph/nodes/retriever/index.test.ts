/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { Replacements } from '@kbn/elastic-assistant-common';

import { getRetrieveAnonymizedAlertsNode } from '.';
import { mockAnonymizedAlerts } from '../../../../evaluation/__mocks__/mock_anonymized_alerts';
import type { GraphState } from '../../types';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../../../../../prompt/prompts';

const initialGraphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt: ATTACK_DISCOVERY_DEFAULT,
  anonymizedAlerts: [],
  combinedGenerations: '',
  combinedRefinements: '',
  continuePrompt: ATTACK_DISCOVERY_CONTINUE,
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt: ATTACK_DISCOVERY_REFINE,
  replacements: {},
  unrefinedResults: null,
};

jest.mock('./anonymized_alerts_retriever', () => ({
  AnonymizedAlertsRetriever: jest
    .fn()
    .mockImplementation(
      ({
        onNewReplacements,
        replacements,
      }: {
        onNewReplacements?: (replacements: Replacements) => void;
        replacements?: Replacements;
      }) => ({
        withConfig: jest.fn().mockReturnValue({
          invoke: jest.fn(async () => {
            if (onNewReplacements != null && replacements != null) {
              onNewReplacements(replacements);
            }

            return mockAnonymizedAlerts;
          }),
        }),
      })
    ),
}));

describe('getRetrieveAnonymizedAlertsNode', () => {
  const logger = {
    debug: jest.fn(),
  } as unknown as Logger;

  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  });

  it('returns a function', () => {
    const result = getRetrieveAnonymizedAlertsNode({
      esClient,
      logger,
    });
    expect(typeof result).toBe('function');
  });

  it('updates state with anonymized alerts', async () => {
    const state: GraphState = { ...initialGraphState };

    const retrieveAnonymizedAlerts = getRetrieveAnonymizedAlertsNode({
      esClient,
      logger,
    });

    const result = await retrieveAnonymizedAlerts(state);

    expect(result).toHaveProperty('anonymizedAlerts', mockAnonymizedAlerts);
  });

  it('calls onNewReplacements with updated replacements', async () => {
    const state: GraphState = { ...initialGraphState };
    const onNewReplacements = jest.fn();
    const replacements = { key: 'value' };

    const retrieveAnonymizedAlerts = getRetrieveAnonymizedAlertsNode({
      esClient,
      logger,
      onNewReplacements,
      replacements,
    });

    await retrieveAnonymizedAlerts(state);

    expect(onNewReplacements).toHaveBeenCalledWith({
      ...replacements,
    });
  });
});
