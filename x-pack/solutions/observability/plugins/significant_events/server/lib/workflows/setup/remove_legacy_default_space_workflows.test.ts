/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../../common/constants';
import { removeLegacyDefaultSpaceWorkflows } from './remove_legacy_default_space_workflows';

// pollUntil waits 2s between polls; the waits themselves are not under test.
jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

describe('removeLegacyDefaultSpaceWorkflows', () => {
  let logger: { info: jest.Mock; warn: jest.Mock };
  let getWorkflow: jest.Mock;
  let updateWorkflow: jest.Mock;
  let cancelAllActiveWorkflowExecutions: jest.Mock;
  let getWorkflowExecutions: jest.Mock;
  let deleteWorkflows: jest.Mock;

  const givenWorkflows = (workflows: Record<string, { enabled: boolean }>) => {
    getWorkflow.mockImplementation(async (id: string) => workflows[id] ?? null);
  };

  const run = () =>
    removeLegacyDefaultSpaceWorkflows({
      managementApi: {
        getWorkflow,
        updateWorkflow,
        cancelAllActiveWorkflowExecutions,
        getWorkflowExecutions,
        deleteWorkflows,
      } as unknown as WorkflowsServerPluginSetup['management'],
      logger,
    });

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn() };
    getWorkflow = jest.fn();
    updateWorkflow = jest.fn().mockResolvedValue({ enabled: false, validationErrors: [] });
    cancelAllActiveWorkflowExecutions = jest.fn().mockResolvedValue(undefined);
    getWorkflowExecutions = jest.fn().mockResolvedValue({ results: [], total: 0 });
    deleteWorkflows = jest.fn().mockResolvedValue({ deleted: 1, failures: [] });
  });

  it('does nothing when no legacy workflow is left', async () => {
    givenWorkflows({});

    await run();

    expect(updateWorkflow).not.toHaveBeenCalled();
    expect(cancelAllActiveWorkflowExecutions).not.toHaveBeenCalled();
    expect(deleteWorkflows).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('drains and force-deletes the unmanaged legacy extraction workflow', async () => {
    givenWorkflows({ [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID]: { enabled: true } });

    await run();

    expect(updateWorkflow).toHaveBeenCalledWith(
      LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      { enabled: false },
      'default',
      expect.anything()
    );
    expect(deleteWorkflows).toHaveBeenCalledWith(
      [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      'default',
      expect.anything(),
      { force: true }
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removed enabled legacy continuous KI onboarding workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
      )
    );
  });

  it('deletes the legacy workflow only after its cancelled runs finish', async () => {
    givenWorkflows({ [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID]: { enabled: false } });
    getWorkflowExecutions
      .mockResolvedValueOnce({ results: [{ id: 'exec-1' }], total: 1 })
      .mockResolvedValue({ results: [], total: 0 });

    await run();

    expect(getWorkflowExecutions).toHaveBeenCalledTimes(2);
    const [lastPollOrder] = getWorkflowExecutions.mock.invocationCallOrder.slice(-1);
    const [deleteOrder] = deleteWorkflows.mock.invocationCallOrder;
    expect(deleteOrder).toBeGreaterThan(lastPollOrder);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps the legacy workflow and logs when its runs never finish', async () => {
    givenWorkflows({ [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID]: { enabled: false } });
    getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'exec-1' }], total: 1 });

    await run();

    expect(deleteWorkflows).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to remove legacy workflow ${LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ` +
        'Condition not met after 30 attempts (polled every 2000ms)'
    );
  });
});
