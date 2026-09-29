/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE,
  SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { createMemoryStore, runMemoryOptimize } from './register_memory';
import { optimizeMemory } from './optimize';

jest.mock('./optimize', () => ({
  createLlmProposeMemoryExtractions: jest.fn(() => jest.fn()),
  createLlmProposeMemoryLabels: jest.fn(() => jest.fn()),
  createLlmSynthesizeMemoryGroup: jest.fn(() => jest.fn()),
  optimizeMemory: jest.fn(),
}));

describe('createMemoryStore', () => {
  it('creates a space-scoped store without an agent boundary', () => {
    expect(
      createMemoryStore({
        esClient: {} as never,
        logger: loggerMock.create(),
        spaceId: 'default',
      })
    ).toBeDefined();
  });
});

describe('runMemoryOptimize', () => {
  const request = { headers: {} } as never;
  const createModelProvider = jest.fn();
  const getAgentBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createModelProvider.mockReturnValue({
      getDefaultModel: jest.fn().mockResolvedValue({
        inferenceClient: { output: jest.fn() },
        connector: { connectorId: 'connector-1' },
      }),
    });
    getAgentBuilder.mockReturnValue({ runtime: { createModelProvider } });
  });

  it('attributes inherited connector calls to the Nightshift investigation feature', async () => {
    await runMemoryOptimize({
      request,
      agentId: 'nightshift.investigation',
      userMessage: 'why?',
      assistantMessage: 'redis',
      recalledIds: [],
      esClient: {} as never,
      spaceId: 'default',
      getAgentBuilder,
      logger: loggerMock.create(),
      connectorId: 'anthropic-sonnet',
      interactionId: 'execution-1',
    });

    expect(createModelProvider).toHaveBeenCalledWith({
      request,
      defaultConnectorId: 'anthropic-sonnet',
      telemetryMetadata: {
        pluginId: SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
        aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
        productSolution: SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION,
        productFeature: SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE,
        interactionId: 'execution-1',
      },
    });
    expect(optimizeMemory).toHaveBeenCalled();
  });
});
