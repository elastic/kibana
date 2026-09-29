/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { removeLegacyDefaultSpaceWorkflows } from './remove_legacy_default_space_workflows';

const DEFAULT_SPACE_SYNC_WORKFLOW_ID = `${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID}-default`;

describe('removeLegacyDefaultSpaceWorkflows', () => {
  let logger: { info: jest.Mock; warn: jest.Mock };
  let getWorkflow: jest.Mock;
  let cancelAllActiveWorkflowExecutions: jest.Mock;
  let uninstall: jest.Mock;

  const givenWorkflows = (workflows: Record<string, { enabled: boolean }>) => {
    getWorkflow.mockImplementation(async (id: string) => workflows[id] ?? null);
  };

  const run = () =>
    removeLegacyDefaultSpaceWorkflows({
      getManagedWorkflowsClient: jest.fn().mockResolvedValue({ uninstall }),
      managementApi: {
        getWorkflow,
        cancelAllActiveWorkflowExecutions,
        deleteWorkflows: jest.fn().mockResolvedValue({ deleted: 1, failures: [] }),
      } as unknown as WorkflowsServerPluginSetup['management'],
      logger,
    });

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn() };
    getWorkflow = jest.fn();
    cancelAllActiveWorkflowExecutions = jest.fn().mockResolvedValue(undefined);
    uninstall = jest.fn().mockResolvedValue(undefined);
  });

  it('keeps the legacy sync workflow while the default space replacement is missing', async () => {
    givenWorkflows({});

    await run();

    expect(uninstall).not.toHaveBeenCalledWith(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
      spaceId: 'default',
    });
  });

  it('keeps the legacy sync workflow while the default space replacement is disabled', async () => {
    givenWorkflows({ [DEFAULT_SPACE_SYNC_WORKFLOW_ID]: { enabled: false } });

    await run();

    expect(uninstall).not.toHaveBeenCalledWith(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
      spaceId: 'default',
    });
  });

  it('cancels and uninstalls the legacy sync workflow once the replacement is enabled', async () => {
    givenWorkflows({ [DEFAULT_SPACE_SYNC_WORKFLOW_ID]: { enabled: true } });

    await run();

    expect(cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      'default',
      expect.anything()
    );
    expect(uninstall).toHaveBeenCalledWith(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
      spaceId: 'default',
    });
  });

  it('uninstalls a legacy workflow that has no executions left to cancel', async () => {
    givenWorkflows({});
    cancelAllActiveWorkflowExecutions.mockRejectedValue(
      new WorkflowNotFoundError(SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID)
    );

    await run();

    expect(uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      {
        spaceId: 'default',
      }
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a failed removal and still handles the remaining workflows', async () => {
    givenWorkflows({ [DEFAULT_SPACE_SYNC_WORKFLOW_ID]: { enabled: true } });
    uninstall.mockImplementation(async (id: string) => {
      if (id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID) {
        throw new Error('uninstall failed');
      }
    });

    await expect(run()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to remove legacy workflow ${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}: uninstall failed`
    );
    expect(uninstall).toHaveBeenCalledWith(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
      spaceId: 'default',
    });
  });
});
