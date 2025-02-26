/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { DefendInsightType, Replacements } from '@kbn/elastic-assistant-common';

import type { GraphState } from '../../types';
import { mockAnonymizedEvents } from '../../mock/mock_anonymized_events';
import { getDefaultRefinePrompt } from '../refine/helpers/get_default_refine_prompt';
import { getDefendInsightsPrompt } from '../helpers/prompts';
import { getRetrieveAnonymizedEventsNode } from '.';

const insightType = DefendInsightType.Enum.incompatible_antivirus;
const initialGraphState: GraphState = {
  insights: null,
  prompt: getDefendInsightsPrompt({ type: insightType }),
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
  refinePrompt: getDefaultRefinePrompt(),
  replacements: {},
  unrefinedResults: null,
};

jest.mock('./anonymized_events_retriever', () => ({
  AnonymizedEventsRetriever: jest
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

            return mockAnonymizedEvents;
          }),
        }),
      })
    ),
}));

describe('getRetrieveAnonymizedEventsNode', () => {
  const logger = {
    debug: jest.fn(),
  } as unknown as Logger;

  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  });

  it('returns a function', () => {
    const result = getRetrieveAnonymizedEventsNode({
      insightType,
      endpointIds: [],
      esClient,
      logger,
    });
    expect(typeof result).toBe('function');
  });

  it('updates state with anonymized events', async () => {
    const state: GraphState = { ...initialGraphState };

    const retrieveAnonymizedEvents = getRetrieveAnonymizedEventsNode({
      insightType,
      endpointIds: [],
      esClient,
      logger,
    });

    const result = await retrieveAnonymizedEvents(state);

    expect(result).toHaveProperty('anonymizedEvents', mockAnonymizedEvents);
  });

  it('calls onNewReplacements with updated replacements', async () => {
    const state: GraphState = { ...initialGraphState };
    const onNewReplacements = jest.fn();
    const replacements = { key: 'value' };

    const retrieveAnonymizedEvents = getRetrieveAnonymizedEventsNode({
      insightType,
      endpointIds: [],
      esClient,
      logger,
      onNewReplacements,
      replacements,
    });

    await retrieveAnonymizedEvents(state);

    expect(onNewReplacements).toHaveBeenCalledWith({
      ...replacements,
    });
  });
});
