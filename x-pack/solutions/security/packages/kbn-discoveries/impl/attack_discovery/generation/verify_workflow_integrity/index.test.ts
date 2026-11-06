/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { DefaultWorkflowIds, WorkflowIntegrityResult } from '../types';
import { verifyWorkflowIntegrity } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const defaultWorkflowIds: DefaultWorkflowIds = {
  default_alert_retrieval: 'retrieval-id',
  generation: 'generation-id',
  validate: 'validate-id',
};

const makeIntactResult = (): WorkflowIntegrityResult => ({
  optionalRepaired: [],
  optionalWarnings: [],
  repaired: [],
  status: 'all_intact' as const,
  unrepairableErrors: [],
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('verifyWorkflowIntegrity', () => {
  describe('early return (no-op) cases', () => {
    it('returns the original defaultWorkflowIds with null integrityResult when checkIntegrity is undefined', async () => {
      await expect(
        verifyWorkflowIntegrity({
          checkIntegrity: undefined,
          defaultWorkflowIds,
          logger: mockLogger,
        })
      ).resolves.toEqual({ integrityResult: null, updatedIds: defaultWorkflowIds });
    });

    it('returns null updatedIds with null integrityResult when defaultWorkflowIds is null', async () => {
      const mockCheckIntegrity = jest.fn();

      await expect(
        verifyWorkflowIntegrity({
          checkIntegrity: mockCheckIntegrity,
          defaultWorkflowIds: null,
          logger: mockLogger,
        })
      ).resolves.toEqual({ integrityResult: null, updatedIds: null });

      expect(mockCheckIntegrity).not.toHaveBeenCalled();
    });
  });

  describe('all_intact', () => {
    it('calls checkIntegrity and resolves when all workflows are intact', async () => {
      const intactResult = makeIntactResult();
      const mockCheckIntegrity = jest.fn().mockResolvedValue(intactResult);

      await expect(
        verifyWorkflowIntegrity({
          checkIntegrity: mockCheckIntegrity,
          defaultWorkflowIds,
          logger: mockLogger,
        })
      ).resolves.toEqual({ integrityResult: intactResult, updatedIds: defaultWorkflowIds });

      expect(mockCheckIntegrity).toHaveBeenCalledTimes(1);
    });
  });

  describe('repaired (required workflows)', () => {
    it('returns updated DefaultWorkflowIds with the new IDs from repaired workflows', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        repaired: [{ key: 'generation', workflowId: 'new-generation-id' }],
        status: 'repaired',
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual({
        ...defaultWorkflowIds,
        generation: 'new-generation-id',
      });
    });

    it('returns updated DefaultWorkflowIds when multiple workflows are repaired', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        repaired: [
          { key: 'generation', workflowId: 'new-generation-id' },
          { key: 'validate', workflowId: 'new-validate-id' },
        ],
        status: 'repaired',
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual({
        ...defaultWorkflowIds,
        generation: 'new-generation-id',
        validate: 'new-validate-id',
      });
    });
  });

  describe('optionalRepaired', () => {
    it('returns updated DefaultWorkflowIds including repaired optional workflow IDs', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        optionalRepaired: [{ key: 'custom_validation_example', workflowId: 'custom-id' }],
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual({
        ...defaultWorkflowIds,
        custom_validation_example: 'custom-id',
      });
    });

    it('returns updated DefaultWorkflowIds with optional repaired ID', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        optionalRepaired: [{ key: 'run_example', workflowId: 'run-id' }],
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual({ ...defaultWorkflowIds, run_example: 'run-id' });
    });
  });

  describe('optionalWarnings', () => {
    it('logs warnings for optional workflow failures without throwing', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        optionalWarnings: [
          {
            error: 'create failed',
            key: 'run_example',
            workflowId: 'run-id',
          },
        ],
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('run_example'));
    });

    it('does NOT throw for optional workflow failures', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        optionalWarnings: [
          { error: 'some failure', key: 'run_example', workflowId: 'run-id' },
          {
            error: 'another failure',
            key: 'custom_validation_example',
            workflowId: 'custom-id',
          },
        ],
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
    });
  });

  describe('repair_failed (required workflows)', () => {
    it('throws an error with a descriptive message listing unrepairable keys', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        repaired: [],
        status: 'repair_failed',
        unrepairableErrors: [
          { error: 'Workflow not found', key: 'generation', workflowId: 'generation-id' },
          { error: 'Permission denied', key: 'validate', workflowId: 'validate-id' },
        ],
      });

      await expect(
        verifyWorkflowIntegrity({
          checkIntegrity: mockCheckIntegrity,
          defaultWorkflowIds,
          logger: mockLogger,
        })
      ).rejects.toThrow(/generation.*validate|validate.*generation/);
    });

    it('throws an error that includes the error details for each unrepairable workflow', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        repaired: [],
        status: 'repair_failed',
        unrepairableErrors: [
          { error: 'Workflow not found', key: 'generation', workflowId: 'generation-id' },
        ],
      });

      await expect(
        verifyWorkflowIntegrity({
          checkIntegrity: mockCheckIntegrity,
          defaultWorkflowIds,
          logger: mockLogger,
        })
      ).rejects.toThrow(/generation/);
    });

    it('does NOT throw when repair_failed only affects optional workflows (status remains all_intact)', async () => {
      const mockCheckIntegrity = jest.fn().mockResolvedValue({
        ...makeIntactResult(),
        optionalWarnings: [{ error: 'failed', key: 'run_example', workflowId: 'run-id' }],
        status: 'all_intact',
      });

      const result = await verifyWorkflowIntegrity({
        checkIntegrity: mockCheckIntegrity,
        defaultWorkflowIds,
        logger: mockLogger,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
    });
  });
});
