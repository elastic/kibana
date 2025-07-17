/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomEvaluator } from './rule_migrations_task_evaluator';
import { RuleMigrationTaskEvaluator } from './rule_migrations_task_evaluator';
import type { Run, Example } from 'langsmith/schemas';
import { createRuleMigrationsDataClientMock } from '../data/__mocks__/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type { AuthenticatedUser } from '@kbn/core/server';

// Mock dependencies
jest.mock('langsmith/evaluation', () => ({
  evaluate: jest.fn(() => Promise.resolve()),
}));

jest.mock('@kbn/langchain/server/tracers/langsmith', () => ({
  isLangSmithEnabled: jest.fn(() => true),
}));

jest.mock('langsmith', () => ({
  Client: jest.fn().mockImplementation(() => ({
    listExamples: jest.fn(() => [{ id: 'example-1' }, { id: 'example-2' }]),
  })),
}));

describe('RuleMigrationTaskEvaluator', () => {
  let taskEvaluator: RuleMigrationTaskEvaluator;
  let mockRuleMigrationsDataClient: ReturnType<typeof createRuleMigrationsDataClientMock>;
  let abortController: AbortController;

  const mockLogger = loggerMock.create();
  const mockDependencies: jest.Mocked<SiemRuleMigrationsClientDependencies> = {
    rulesClient: {},
    savedObjectsClient: {},
    inferenceClient: {},
    actionsClient: {
      get: jest.fn().mockResolvedValue({ id: 'test-connector-id', name: 'Test Connector' }),
    },
    telemetry: {},
  } as unknown as SiemRuleMigrationsClientDependencies;

  const mockUser = {} as unknown as AuthenticatedUser;

  beforeAll(() => {
    mockRuleMigrationsDataClient = createRuleMigrationsDataClientMock();
    abortController = new AbortController();

    taskEvaluator = new RuleMigrationTaskEvaluator(
      'test-migration-id',
      mockUser,
      abortController,
      mockRuleMigrationsDataClient,
      mockLogger,
      mockDependencies
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluators', () => {
    let evaluator: CustomEvaluator;
    // Helper to access private evaluator methods
    const setEvaluator = (name: string) => {
      // @ts-expect-error (accessing private property)
      evaluator = taskEvaluator.evaluators[name];
    };

    describe('translation_result evaluator', () => {
      beforeAll(() => {
        setEvaluator('translation_result');
      });

      it('should return true score when translation results match', () => {
        const mockRun = { outputs: { translation_result: 'full' } } as unknown as Run;
        const mockExample = { outputs: { translation_result: 'full' } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: true,
          comment: 'Correct',
        });
      });

      it('should return false score when translation results do not match', () => {
        const mockRun = { outputs: { translation_result: 'full' } } as unknown as Run;
        const mockExample = { outputs: { translation_result: 'partial' } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: false,
          comment: 'Incorrect, expected "partial" but got "full"',
        });
      });

      it('should ignore score when expected result is missing', () => {
        const mockRun = { outputs: { translation_result: 'full' } } as unknown as Run;
        const mockExample = { outputs: {} } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          comment: 'No translation result expected',
        });
      });

      it('should return false score when run result is missing', () => {
        const mockRun = { outputs: {} } as unknown as Run;
        const mockExample = { outputs: { translation_result: 'full' } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: false,
          comment: 'No translation result received',
        });
      });
    });

    describe('custom_query_accuracy evaluator', () => {
      beforeAll(() => {
        setEvaluator('custom_query_accuracy');
      });

      it('should return perfect score when queries are identical', () => {
        const mockRun = {
          outputs: { elastic_rule: { query: 'process.name:test AND user.name:admin' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { query: 'process.name:test AND user.name:admin' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: 1,
          comment: 'Distance: 0',
        });
      });

      it('should calculate similarity score when queries are different', () => {
        const mockRun = {
          outputs: { elastic_rule: { query: 'process.name:testing' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { query: 'process.name:testing AND user.name:admin' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        // Expected distance would be the length of " AND user.name:admin" which is 20 characters
        // Total length of expected query is 40 characters
        // Similarity = 1 - (20/40) = 0.5
        expect(result.score).toEqual(0.5);
        expect(result.comment).toEqual('Distance: 20');
      });

      it('should calculate similarity score with a precision of 3 decimals', () => {
        const mockRun = {
          outputs: { elastic_rule: { query: 'process.name:test' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { query: 'process.name:test AND user.name:admin' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        // Similarity = 1 - (20/37) = 0.45945945945945943
        expect(result.score).toEqual(0.459);
      });

      it('should calculate similarity score with a precision of 3 decimals rounded correctly', () => {
        const mockRun = {
          outputs: { elastic_rule: { query: 'process.name:tests' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { query: 'process.name:tests AND user.name:admin' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        // Similarity = 1 - (20/38) = 0.4736842105263158
        expect(result.score).toEqual(0.474);
      });

      it('should ignore score when no custom query is expected', () => {
        const mockRun = { outputs: { elastic_rule: {} } } as unknown as Run;
        const mockExample = { outputs: { elastic_rule: {} } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          comment: 'No custom translation expected',
        });
      });

      it('should handle case when no custom query is expected but one is received', () => {
        const mockRun = {
          outputs: { elastic_rule: { query: 'process.name:tests' } },
        } as unknown as Run;
        const mockExample = { outputs: { elastic_rule: {} } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: 0,
          comment: 'No custom translation expected, but received',
        });
      });

      it('should handle case when no custom query is returned but one was expected', () => {
        const mockRun = { outputs: { elastic_rule: {} } } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { query: 'process.name:test' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: 0,
          comment: 'Custom translation expected, but not received',
        });
      });
    });

    describe('prebuilt_rule_match evaluator', () => {
      beforeAll(() => {
        setEvaluator('prebuilt_rule_match');
      });

      it('should return success when prebuilt rule IDs match', () => {
        const mockRun = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-123' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-123' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: true,
          comment: 'Correct match',
        });
      });

      it('should return failure when prebuilt rule IDs do not match', () => {
        const mockRun = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-123' } },
        } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-456' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: false,
          comment: 'Incorrect match, expected ID is "rule-456" but got "rule-123"',
        });
      });

      it('should handle case when no prebuilt rule is expected', () => {
        const mockRun = { outputs: { elastic_rule: {} } } as unknown as Run;
        const mockExample = { outputs: { elastic_rule: {} } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          comment: 'No prebuilt rule expected',
        });
      });

      it('should handle case when no prebuilt rule is expected but one is received', () => {
        const mockRun = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-123' } },
        } as unknown as Run;
        const mockExample = { outputs: { elastic_rule: {} } } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: false,
          comment: 'No prebuilt rule expected, but received',
        });
      });

      it('should handle case when no prebuilt rule is returned but one was expected', () => {
        const mockRun = { outputs: { elastic_rule: {} } } as unknown as Run;
        const mockExample = {
          outputs: { elastic_rule: { prebuilt_rule_id: 'rule-123' } },
        } as unknown as Example;

        const result = evaluator({ run: mockRun, example: mockExample });

        expect(result).toEqual({
          score: false,
          comment: 'Prebuilt rule expected, but not received',
        });
      });
    });
  });
});
