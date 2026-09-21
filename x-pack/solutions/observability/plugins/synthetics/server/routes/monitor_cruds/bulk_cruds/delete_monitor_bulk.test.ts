/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { deleteSyntheticsMonitorBulkRoute } from './delete_monitor_bulk';

jest.mock('../services/delete_monitor_api', () => ({
  DeleteMonitorAPI: jest.fn(),
}));

const installExecuteResult = (executeResult: any) => {
  const { DeleteMonitorAPI } = jest.requireMock('../services/delete_monitor_api');
  const execute = jest.fn().mockResolvedValue(executeResult);
  DeleteMonitorAPI.mockImplementation(() => ({ execute }));
  return { execute };
};

const mockRouteContext = () =>
  ({
    request: { body: { ids: ['mon-1'] } } as any,
  } as any);

describe('deleteSyntheticsMonitorBulkRoute', () => {
  const route = deleteSyntheticsMonitorBulkRoute();
  const bodySchema = (route.validation as { request: { body: z.ZodType } }).request.body;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown keys so a dry_run typo cannot proceed as a real delete', () => {
    expect(bodySchema.safeParse({ ids: ['mon-1'], dry_run: true }).success).toBe(false);
  });

  it('returns the forbidden response from execute instead of a 200 body', async () => {
    const forbidden = { status: 403, body: { message: 'no access' } };
    installExecuteResult({ res: forbidden });

    const result = await route.handler(mockRouteContext());

    expect(result).toBe(forbidden);
  });

  it('returns result and errors when execute succeeds', async () => {
    const result = [{ id: 'mon-1', deleted: true }];
    installExecuteResult({ errors: [], result });

    const response = await route.handler(mockRouteContext());

    expect(response).toEqual({ result, errors: [] });
  });
});
