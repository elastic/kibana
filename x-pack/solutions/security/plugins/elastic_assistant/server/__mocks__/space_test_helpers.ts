/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticAssistantApiRequestHandlerContext } from '../types';

// Type definitions for mock clients and contexts
type MockSearchCall = [{ index?: string }];
type MockElasticsearchClient = {
  search?: {
    mock?: {
      calls: MockSearchCall[];
    };
  };
};

type SpaceAwareContext = Partial<ElasticAssistantApiRequestHandlerContext> & {
  elasticAssistant?: {
    getSpaceId?: jest.MockedFunction<() => string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Helper to override the getSpaceId mock for a specific space in tests
 */
export const withSpace = (spaceId: string) => (context: SpaceAwareContext) => {
  if (context.elasticAssistant?.getSpaceId) {
    context.elasticAssistant.getSpaceId = jest.fn().mockReturnValue(spaceId);
  }
  return context;
};

/**
 * Helper to verify that space-scoped index names are used correctly
 * @param mockClient - Mock Elasticsearch client with search calls
 * @param spaceId - Expected space ID to be found in index names
 */
export const expectSpaceScopedIndex = (mockClient: MockElasticsearchClient, spaceId: string): void => {
  const calls = mockClient.search?.mock?.calls || [];
  if (calls.length > 0) {
    const lastCall = calls[calls.length - 1];
    const indexName = lastCall[0]?.index;
    if (indexName && typeof indexName === 'string') {
      expect(indexName).toContain(`-${spaceId}`);
    }
  }
};

/**
 * Helper to verify that data client was initialized with the correct spaceId
 * @param dataClientGetter - Jest mock of the data client getter function
 * @param expectedSpaceId - Expected space ID that should be passed to the data client
 */
export const expectDataClientWithSpaceId = (
  dataClientGetter: jest.MockedFunction<(params: { spaceId: string }) => unknown>,
  expectedSpaceId: string
): void => {
  expect(dataClientGetter).toHaveBeenCalledWith(
    expect.objectContaining({
      spaceId: expectedSpaceId,
    })
  );
};

/**
 * Common space test scenarios that can be applied to any route
 * These provide consistent space IDs for testing different scenarios
 */
export const spaceTestScenarios = {
  /** Non-default space for testing functionality in custom spaces */
  nonDefaultSpace: 'marketing-team',
  /** Alternative space for testing space isolation */
  alternativeSpace: 'engineering-team',
  /** Default Kibana space */
  defaultSpace: 'default',
} as const;
