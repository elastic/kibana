/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import {
  SiemMigrationsBaseEvaluator,
  type CustomEvaluator,
} from './siem_migrations_task_evaluator';
import type { Run, Example } from 'langsmith/schemas';
import { loggerMock } from '@kbn/logging-mocks';
import type { SiemMigrationsClientDependencies } from '../types';
import { SiemMigrationTaskRunner } from './siem_migrations_task_runner';

vi.mock('./siem_migrations_task_runner', () => {
  const mocked = {
    SiemMigrationTaskRunner: vi.fn().mockReturnValue({
      prepareTaskInvoke: vi.fn(),
      setup: vi.fn(),
      run: vi.fn(),
      abortController: new AbortController(),
    }),
  };
  return { ...mocked, default: mocked };
});

// Mock dependencies
vi.mock('langsmith/evaluation', () => {
  const mocked = {
    evaluate: vi.fn(() => Promise.resolve()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/langchain/server/tracers/langsmith', () => {
  const mocked = {
    isLangSmithEnabled: vi.fn(() => true),
  };
  return { ...mocked, default: mocked };
});

vi.mock('langsmith', () => {
  const mocked = {
    Client: vi.fn().mockImplementation(() => ({
      listExamples: vi.fn(() => [{ id: 'example-1' }, { id: 'example-2' }]),
    })),
  };
  return { ...mocked, default: mocked };
});

// Create generic task evaluator class using the generic task runner
class SiemMigrationTaskEvaluator extends SiemMigrationsBaseEvaluator {
  protected evaluators: Record<string, CustomEvaluator> = {};
}

describe('SiemMigrationsBaseEvaluator', () => {
  let taskEvaluator: SiemMigrationTaskEvaluator;

  const mockLogger = loggerMock.create();
  const mockDependencies: Mocked<SiemMigrationsClientDependencies> = {
    rulesClient: {},
    savedObjectsClient: {},
    inferenceClient: {},
    actionsClient: {
      get: vi.fn().mockResolvedValue({ id: 'test-connector-id', name: 'Test Connector' }),
    },
    telemetry: {},
  } as unknown as SiemMigrationsClientDependencies;

  beforeAll(() => {
    const taskRunner = (SiemMigrationTaskRunner as Mock)();
    taskEvaluator = new SiemMigrationTaskEvaluator(taskRunner, mockDependencies, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluators', () => {
    let evaluator: CustomEvaluator;
    // Helper to access private evaluator methods
    const setEvaluator = (name: string) => {
      // @ts-expect-error accessing protected property
      evaluator = taskEvaluator.genericEvaluators[name];
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
  });
});
