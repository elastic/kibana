/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createEnsureFailureSweep } from './ensure_failure_sweep';

const setup = () => {
  const request = httpServerMock.createKibanaRequest();
  const getWorkflow = jest.fn().mockResolvedValue({ enabled: true });
  const management = { getClient: jest.fn(() => ({ getWorkflow })), updateWorkflow: jest.fn() };
  const install = jest.fn();
  const logger = loggerMock.create();
  const ensure = createEnsureFailureSweep({
    getWorkflowsManagement: () => ({ management } as never),
    getManagedWorkflowsClient: async () => ({ install } as never),
    logger,
  });
  return { request, getWorkflow, management, install, logger, ensure };
};

describe('ensure investigation failure sweep', () => {
  it('installs a disabled per-space copy, then schedules it using the enabling request', async () => {
    const { request, getWorkflow, management, install, ensure } = setup();
    getWorkflow.mockResolvedValueOnce(null).mockResolvedValueOnce({ enabled: false });
    await ensure(request, 'ops');
    expect(install).toHaveBeenCalledWith(NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID, {
      spaceId: 'ops',
      workflowIdSuffix: 'ops',
    });
    expect(management.updateWorkflow).toHaveBeenCalledWith(
      `${NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID}-ops`,
      { enabled: true },
      'ops',
      request
    );
  });
  it('preserves an enabled scheduler identity', async () => {
    const { request, management, install, ensure } = setup();
    await ensure(request, 'ops');
    expect(management.getClient).toHaveBeenCalledWith(request);
    expect(install).not.toHaveBeenCalled();
    expect(management.updateWorkflow).not.toHaveBeenCalled();
  });
  it('logs denied installation without failing investigation creation', async () => {
    const { request, getWorkflow, logger, ensure } = setup();
    getWorkflow.mockRejectedValue(new Error('Access denied'));
    await expect(ensure(request, 'ops')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
  });
});
