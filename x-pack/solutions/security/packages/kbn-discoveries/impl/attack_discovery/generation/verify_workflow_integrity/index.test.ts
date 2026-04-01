/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import type { DefaultWorkflowIds, WorkflowInitializationService } from '../types';
import { verifyWorkflowIntegrity } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockRequest = {} as never;

const defaultWorkflowIds: DefaultWorkflowIds = {
  default_alert_retrieval: 'retrieval-id',
  generation: 'generation-id',
  validate: 'validate-id',
};

const mockWorkflowInitService: WorkflowInitializationService = {
  ensureWorkflowsForSpace: jest.fn(),
  verifyAndRepairWorkflows: jest.fn(),
};

const mockAnalytics = {
  reportEvent: jest.fn(),
} as unknown as AnalyticsServiceSetup;

const makeIntactResult = () => ({
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
    it('returns the original defaultWorkflowIds with null integrityResult when workflowInitService is undefined', async () => {
      await expect(
        verifyWorkflowIntegrity({
          analytics: mockAnalytics,
          defaultWorkflowIds,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowInitService: undefined,
        })
      ).resolves.toEqual({ integrityResult: null, updatedIds: defaultWorkflowIds });

      expect(mockWorkflowInitService.verifyAndRepairWorkflows).not.toHaveBeenCalled();
    });

    it('returns null updatedIds with null integrityResult when defaultWorkflowIds is null', async () => {
      await expect(
        verifyWorkflowIntegrity({
          analytics: mockAnalytics,
          defaultWorkflowIds: null,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowInitService: mockWorkflowInitService,
        })
      ).resolves.toEqual({ integrityResult: null, updatedIds: null });

      expect(mockWorkflowInitService.verifyAndRepairWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('all_intact', () => {
    it('resolves without emitting telemetry when all workflows are intact', async () => {
      const intactResult = makeIntactResult();
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue(
        intactResult
      );

      await expect(
        verifyWorkflowIntegrity({
          analytics: mockAnalytics,
          defaultWorkflowIds,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowInitService: mockWorkflowInitService,
        })
      ).resolves.toEqual({ integrityResult: intactResult, updatedIds: defaultWorkflowIds });

      expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('repaired (required workflows)', () => {
    it('emits workflow_modified telemetry for each repaired required workflow', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        repaired: [
          { key: 'generation', workflowId: 'generation-id' },
          { key: 'validate', workflowId: 'validate-id' },
        ],
        status: 'repaired',
      });

      await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(2);

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: 'generation-id',
        })
      );

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: 'validate-id',
        })
      );
    });

    it('returns updated DefaultWorkflowIds with the new IDs from repaired workflows', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        repaired: [{ key: 'generation', workflowId: 'new-generation-id' }],
        status: 'repaired',
      });

      const result = await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual({
        ...defaultWorkflowIds,
        generation: 'new-generation-id',
      });
    });

    it('returns updated DefaultWorkflowIds when multiple workflows are repaired', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        repaired: [
          { key: 'generation', workflowId: 'new-generation-id' },
          { key: 'validate', workflowId: 'new-validate-id' },
        ],
        status: 'repaired',
      });

      const result = await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual({
        ...defaultWorkflowIds,
        generation: 'new-generation-id',
        validate: 'new-validate-id',
      });
    });

    it('resolves without throwing when repaired but analytics is not available', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        repaired: [{ key: 'generation', workflowId: 'generation-id' }],
        status: 'repaired',
      });

      const result = await verifyWorkflowIntegrity({
        analytics: undefined,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual(expect.objectContaining({ generation: 'generation-id' }));
      expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('optionalRepaired', () => {
    it('emits workflow_modified telemetry for each repaired optional workflow', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        optionalRepaired: [{ key: 'custom_validation_example', workflowId: 'custom-id' }],
      });

      await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: 'custom-id',
        })
      );
    });

    it('does not emit telemetry for optionalRepaired when analytics is unavailable', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        optionalRepaired: [{ key: 'run_example', workflowId: 'run-id' }],
      });

      const result = await verifyWorkflowIntegrity({
        analytics: undefined,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual({ ...defaultWorkflowIds, run_example: 'run-id' });
      expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('optionalWarnings', () => {
    it('logs warnings for optional workflow failures without throwing', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        optionalWarnings: [
          {
            error: 'create failed',
            key: 'esql_example_alert_retrieval',
            workflowId: 'esql-id',
          },
        ],
      });

      const result = await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('esql_example_alert_retrieval')
      );
    });

    it('does NOT throw for optional workflow failures', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
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
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
    });
  });

  describe('repair_failed (required workflows)', () => {
    it('throws an error with a descriptive message listing unrepairable keys', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
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
          analytics: mockAnalytics,
          defaultWorkflowIds,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowInitService: mockWorkflowInitService,
        })
      ).rejects.toThrow(/generation.*validate|validate.*generation/);
    });

    it('throws an error that includes the error details for each unrepairable workflow', async () => {
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        repaired: [],
        status: 'repair_failed',
        unrepairableErrors: [
          { error: 'Workflow not found', key: 'generation', workflowId: 'generation-id' },
        ],
      });

      await expect(
        verifyWorkflowIntegrity({
          analytics: mockAnalytics,
          defaultWorkflowIds,
          logger: mockLogger,
          request: mockRequest,
          spaceId: 'default',
          workflowInitService: mockWorkflowInitService,
        })
      ).rejects.toThrow(/generation/);
    });

    it('does NOT throw when repair_failed only affects optional workflows (status remains all_intact)', async () => {
      // Optional failures don't set status to repair_failed — they go into optionalWarnings
      (mockWorkflowInitService.verifyAndRepairWorkflows as jest.Mock).mockResolvedValue({
        ...makeIntactResult(),
        optionalWarnings: [{ error: 'failed', key: 'run_example', workflowId: 'run-id' }],
        status: 'all_intact',
      });

      const result = await verifyWorkflowIntegrity({
        analytics: mockAnalytics,
        defaultWorkflowIds,
        logger: mockLogger,
        request: mockRequest,
        spaceId: 'default',
        workflowInitService: mockWorkflowInitService,
      });

      expect(result.updatedIds).toEqual(defaultWorkflowIds);
    });
  });
});
