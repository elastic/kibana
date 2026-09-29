/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { deleteSyntheticsMonitorRoute } from './delete_monitor';

const mockDeleteMonitorApi = vi.hoisted(() => ({ DeleteMonitorAPI: vi.fn() }));
vi.mock('./services/delete_monitor_api', () => ({
  ...mockDeleteMonitorApi,
  default: mockDeleteMonitorApi,
}));

const installExecuteResult = (executeResult: any, result: unknown = []) => {
  const execute = vi.fn().mockResolvedValue(executeResult);
  mockDeleteMonitorApi.DeleteMonitorAPI.mockImplementation(() => ({ execute, result }));
  return { execute };
};

const mockRouteContext = () =>
  ({
    request: { body: { ids: ['mon-1'] }, params: {} } as any,
    response: {
      ok: vi.fn((opts: any) => ({ status: 200, ...opts })),
      badRequest: vi.fn((opts: any) => ({ status: 400, ...opts })),
    } as any,
  } as any);

describe('deleteSyntheticsMonitorRoute', () => {
  const route = deleteSyntheticsMonitorRoute();

  beforeEach(() => {
    vi.clearAllMocks();
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
