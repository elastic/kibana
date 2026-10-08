/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSyntheticsMonitorRoute } from './delete_monitor';

jest.mock('./services/delete_monitor_api', () => ({
  DeleteMonitorAPI: jest.fn(),
}));

const installExecuteResult = (executeResult: any, result: unknown = []) => {
  const { DeleteMonitorAPI } = jest.requireMock('./services/delete_monitor_api');
  const execute = jest.fn().mockResolvedValue(executeResult);
  DeleteMonitorAPI.mockImplementation(() => ({ execute, result }));
  return { execute };
};

const mockRouteContext = () =>
  ({
    request: { body: { ids: ['mon-1'] }, params: {} } as any,
    response: {
      ok: jest.fn((opts: any) => ({ status: 200, ...opts })),
      badRequest: jest.fn((opts: any) => ({ status: 400, ...opts })),
    } as any,
  } as any);

describe('deleteSyntheticsMonitorRoute', () => {
  const route = deleteSyntheticsMonitorRoute();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the forbidden response from execute instead of a 200', async () => {
    const forbidden = { status: 403, body: { message: 'no access' } };
    installExecuteResult({ res: forbidden });

    const result = await route.handler(mockRouteContext());

    expect(result).toBe(forbidden);
  });

  it('returns the collected result when execute succeeds', async () => {
    installExecuteResult({ errors: [] }, [{ id: 'mon-1', deleted: true }]);

    const result = await route.handler(mockRouteContext());

    expect(result).toEqual([{ id: 'mon-1', deleted: true }]);
  });
});
