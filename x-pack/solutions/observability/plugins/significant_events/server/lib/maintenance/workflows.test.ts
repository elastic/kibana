/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import { httpServerMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { sweepWorkflows } from './workflows';

describe('sweepWorkflows', () => {
  const spaceId = asSpaceId('space-a');

  const createMgmt = () => {
    const api = {
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
      updateWorkflow: jest.fn().mockResolvedValue({ enabled: false, validationErrors: [] }),
      cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    };
    return { ...api, getClient: jest.fn(() => api) };
  };

  it('switches off bound workflows through the owner, since a plain update needs manage_security', async () => {
    const mgmt = createMgmt();
    const disableManaged = jest.fn().mockResolvedValue(true);
    const failures: SignificantEventsMaintenanceFailure[] = [];

    const disabled = await sweepWorkflows({
      mgmt: mgmt as never,
      spaceIds: [spaceId],
      request: httpServerMock.createKibanaRequest(),
      failures,
      disableManaged,
    });

    expect(disableManaged).toHaveBeenCalledWith({
      id: NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
      spaceId,
    });
    expect(disabled).toContainEqual({
      id: `${NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID}-space-a`,
      spaceId,
    });
    expect(mgmt.updateWorkflow).not.toHaveBeenCalled();
    expect(failures).toEqual([]);
  });
});
