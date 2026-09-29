/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID as LEGACY_UNMANAGED_ID } from '../../../../common/constants';
import { removeLegacyDefaultSpaceWorkflows } from './remove_legacy_default_space_workflows';

const createManagementApi = () =>
  ({
    cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    getWorkflow: jest.fn().mockResolvedValue(undefined),
    deleteWorkflows: jest.fn().mockResolvedValue({ deleted: 1, failures: [] }),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>);

describe('removeLegacyDefaultSpaceWorkflows', () => {
  let managementApi: ReturnType<typeof createManagementApi>;
  let uninstall: jest.Mock;
  let logger: Pick<Logger, 'info' | 'warn'>;

  beforeEach(() => {
    managementApi = createManagementApi();
    uninstall = jest.fn().mockResolvedValue(undefined);
    logger = { info: jest.fn(), warn: jest.fn() };
  });

  const run = () =>
    removeLegacyDefaultSpaceWorkflows({
      getManagedWorkflowsClient: jest.fn().mockResolvedValue({ uninstall }),
      managementApi,
      logger,
    });

  it('cancels executions of, then uninstalls, each legacy managed workflow in the default space', async () => {
    await run();

    for (const id of [
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
    ]) {
      expect(managementApi.cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
        id,
        'default',
        expect.anything()
      );
      expect(uninstall).toHaveBeenCalledWith(id, { spaceId: 'default' });
    }
    expect(uninstall).toHaveBeenCalledTimes(2);
  });

  it('uninstalls a managed workflow whose executions are already gone', async () => {
    (managementApi.cancelAllActiveWorkflowExecutions as jest.Mock).mockRejectedValue(
      new WorkflowNotFoundError('missing')
    );

    await run();

    expect(uninstall).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('force deletes the legacy unmanaged workflow when it exists', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ id: LEGACY_UNMANAGED_ID });

    await run();

    expect(managementApi.cancelAllActiveWorkflowExecutions).toHaveBeenCalledWith(
      LEGACY_UNMANAGED_ID,
      'default',
      expect.anything()
    );
    expect(managementApi.deleteWorkflows).toHaveBeenCalledWith(
      [LEGACY_UNMANAGED_ID],
      'default',
      expect.anything(),
      { force: true }
    );
    expect(logger.info).toHaveBeenCalledWith(`Deleted legacy workflow ${LEGACY_UNMANAGED_ID}`);
  });

  it('leaves the legacy unmanaged workflow alone when it does not exist', async () => {
    await run();

    expect(managementApi.deleteWorkflows).not.toHaveBeenCalled();
    expect(managementApi.cancelAllActiveWorkflowExecutions).not.toHaveBeenCalledWith(
      LEGACY_UNMANAGED_ID,
      expect.anything(),
      expect.anything()
    );
  });

  it('logs a failed uninstall and carries on with the remaining workflows', async () => {
    uninstall.mockRejectedValueOnce(new Error('uninstall failed'));
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ id: LEGACY_UNMANAGED_ID });

    await expect(run()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to remove legacy workflow ${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}: uninstall failed`
    );
    expect(uninstall).toHaveBeenCalledTimes(2);
    expect(managementApi.deleteWorkflows).toHaveBeenCalledTimes(1);
  });

  it('logs a failed delete of the unmanaged workflow without throwing', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ id: LEGACY_UNMANAGED_ID });
    (managementApi.deleteWorkflows as jest.Mock).mockResolvedValue({
      deleted: 0,
      failures: [{ id: LEGACY_UNMANAGED_ID, error: 'forbidden' }],
    });

    await expect(run()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to remove legacy workflow ${LEGACY_UNMANAGED_ID}: ${LEGACY_UNMANAGED_ID}: forbidden`
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs when the managed workflows client cannot be resolved', async () => {
    await expect(
      removeLegacyDefaultSpaceWorkflows({
        getManagedWorkflowsClient: jest.fn().mockRejectedValue(new Error('not available')),
        managementApi,
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
