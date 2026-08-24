/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';
import type { RouteContext } from '../../types';
import { deleteSyntheticsMonitorProjectRoute } from './delete_monitor_project';

jest.mock('../services/delete_monitor_api', () => ({
  DeleteMonitorAPI: jest.fn(),
}));

jest.mock('../services/validate_space_id', () => ({
  validateSpaceId: jest.fn().mockResolvedValue(undefined),
}));

const monitor = {
  id: 'config-id',
  type: 'synthetics-monitor',
  attributes: {},
  references: [],
} as unknown as SavedObject<EncryptedSyntheticsMonitorAttributes>;

const createRouteContext = () =>
  ({
    request: {
      params: { projectName: 'project-name' },
      body: { monitors: ['journey-id'] },
    },
    monitorConfigRepository: {
      find: jest.fn().mockResolvedValue({ saved_objects: [monitor] }),
    },
  } as unknown as RouteContext<
    { projectName: string },
    Record<string, never>,
    { monitors: string[] }
  >);

const installExecuteResult = (executeResult: object) => {
  const { DeleteMonitorAPI } = jest.requireMock('../services/delete_monitor_api');
  const execute = jest.fn().mockResolvedValue(executeResult);
  DeleteMonitorAPI.mockImplementation(() => ({ execute }));
  return { execute };
};

describe('deleteSyntheticsMonitorProjectRoute', () => {
  const route = deleteSyntheticsMonitorProjectRoute();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the filtered monitors through the authorized execution path', async () => {
    const { execute } = installExecuteResult({ errors: [], result: [] });

    const result = await route.handler(createRouteContext());

    expect(execute).toHaveBeenCalledWith({ monitorIds: ['config-id'] });
    expect(result).toEqual({ deleted_monitors: ['journey-id'] });
  });

  it('returns the forbidden response from the authorized execution path', async () => {
    const forbidden = { status: 403, body: { message: 'no access' } };
    installExecuteResult({ res: forbidden });

    const result = await route.handler(createRouteContext());

    expect(result).toBe(forbidden);
  });
});
