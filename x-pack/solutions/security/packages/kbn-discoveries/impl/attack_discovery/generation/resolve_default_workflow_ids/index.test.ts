/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowInitializationService } from '../types';
import { resolveDefaultWorkflowIds } from '.';

describe('resolveDefaultWorkflowIds', () => {
  it('returns null when workflowInitService is not provided', async () => {
    await expect(
      resolveDefaultWorkflowIds({
        logger: {} as never,
        request: {} as never,
        spaceId: 'default',
        workflowInitService: undefined,
      })
    ).resolves.toBeNull();
  });

  it('returns ids when the service resolves successfully', async () => {
    const resolved = {
      default_alert_retrieval: 'legacy',
      generation: 'generation',
      validate: 'validate',
    };

    const mockService: WorkflowInitializationService = {
      ensureWorkflowsForSpace: jest.fn().mockResolvedValue(resolved),
      verifyAndRepairWorkflows: jest.fn().mockResolvedValue({
        repaired: [],
        status: 'all_intact',
        unrepairableErrors: [],
      }),
    };

    await expect(
      resolveDefaultWorkflowIds({
        logger: {} as never,
        request: {} as never,
        spaceId: 'default',
        workflowInitService: mockService,
      })
    ).resolves.toEqual(resolved);

    expect(mockService.ensureWorkflowsForSpace).toHaveBeenCalledWith({
      logger: {} as never,
      request: {} as never,
      spaceId: 'default',
    });
  });

  it('returns null when the service resolves to null', async () => {
    const mockService: WorkflowInitializationService = {
      ensureWorkflowsForSpace: jest.fn().mockResolvedValue(null),
      verifyAndRepairWorkflows: jest.fn().mockResolvedValue({
        repaired: [],
        status: 'all_intact',
        unrepairableErrors: [],
      }),
    };

    await expect(
      resolveDefaultWorkflowIds({
        logger: {} as never,
        request: {} as never,
        spaceId: 'default',
        workflowInitService: mockService,
      })
    ).resolves.toBeNull();
  });
});
