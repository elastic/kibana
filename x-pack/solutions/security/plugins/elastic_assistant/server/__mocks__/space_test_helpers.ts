/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import type { ElasticAssistantApiRequestHandlerContext } from '../types';

/**
 * Helper to override the getSpaceId mock for a specific space in tests
 */
export const withSpace = (spaceId: string) => (context: any) => {
  if (context.elasticAssistant?.getSpaceId) {
    context.elasticAssistant.getSpaceId = jest.fn().mockReturnValue(spaceId);
  }
  return context;
};

/**
 * Helper to verify that space-scoped index names are used correctly
 */
export const expectSpaceScopedIndex = (mockClient: any, spaceId: string) => {
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
 */
export const expectDataClientWithSpaceId = (
  dataClientGetter: jest.Mock, 
  expectedSpaceId: string
) => {
  expect(dataClientGetter).toHaveBeenCalledWith(
    expect.objectContaining({
      spaceId: expectedSpaceId
    })
  );
};

/**
 * Test factory for creating space isolation tests
 */
export const createSpaceIsolationTestFactory = (
  testName: string,
  setupSpaceData: (spaceId: string, context: any, server: any) => Promise<any>,
  verifyDataNotAccessible: (context: any, server: any, dataId?: string) => Promise<void>
) => {
  return () => {
    it(`should not access ${testName} from other spaces`, async () => {
      // This would be implemented per test case
      // Left as a template for specific implementations
    });
  };
};

/**
 * Common space test scenarios that can be applied to any route
 */
export const spaceTestScenarios = {
  nonDefaultSpace: 'marketing-team',
  alternativeSpace: 'engineering-team',
  defaultSpace: 'default',
};

/**
 * Helper to create consistent space test suite structure
 */
export const createSpaceTestSuite = (
  routeName: string,
  testImplementations: {
    testNonDefaultSpaceFunctionality: () => Promise<void>;
    testSpaceScopedIndices?: () => Promise<void>;
    testSpaceIsolation?: () => Promise<void>;
  }
) => {
  return {
    [`${routeName} with Spaces`]: () => {
      describe('non-default space behavior', () => {
        beforeEach(() => {
          // Override will be done in individual test files
        });

        it('should work correctly in non-default space', testImplementations.testNonDefaultSpaceFunctionality);

        if (testImplementations.testSpaceScopedIndices) {
          it('should use space-scoped indices', testImplementations.testSpaceScopedIndices);
        }
      });

      if (testImplementations.testSpaceIsolation) {
        describe('space isolation', () => {
          it('should not access data from other spaces', testImplementations.testSpaceIsolation);
        });
      }
    }
  };
};