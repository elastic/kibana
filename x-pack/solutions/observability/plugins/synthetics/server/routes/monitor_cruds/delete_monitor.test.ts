/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSyntheticsMonitorRoute, deleteSyntheticsMonitorsRoute } from './delete_monitor';

jest.mock('./services/delete_monitor_api', () => ({
  DeleteMonitorAPI: jest.fn(),
}));

const installExecuteResult = (executeResult: any, result: unknown = []) => {
  const { DeleteMonitorAPI } = jest.requireMock('./services/delete_monitor_api');
  const execute = jest.fn().mockResolvedValue(executeResult);
  DeleteMonitorAPI.mockImplementation(() => ({ execute, result }));
  return { execute };
};

const mockRouteContext = (request: { body?: unknown; params?: unknown } = {}) =>
  ({
    request: { body: { ids: ['mon-1'] }, params: {}, ...request } as any,
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

  it('returns the not found result for a monitor that does not exist', async () => {
    installExecuteResult({ errors: [] }, [
      { id: 'mon-1', deleted: false, error: 'Monitor id mon-1 not found!' },
    ]);

    const result = await route.handler(mockRouteContext());

    expect(result).toEqual([{ id: 'mon-1', deleted: false, error: 'Monitor id mon-1 not found!' }]);
  });

  it('reports the errors from deleting the monitor at the service', async () => {
    const errors = [
      { locationId: 'us_central', error: { status: 404, reason: 'monitor delete failed' } },
    ];
    installExecuteResult({ errors });
    const routeContext = mockRouteContext();

    await route.handler(routeContext);

    expect(routeContext.response.ok).toHaveBeenCalledWith({
      body: {
        message: 'Error pushing monitor to the service',
        attributes: { errors },
      },
    });
  });
});

describe('monitor delete route ids', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the monitor from the path param', async () => {
    const { execute } = installExecuteResult({ errors: [] });

    await deleteSyntheticsMonitorRoute().handler(
      mockRouteContext({ body: undefined, params: { id: 'mon-path' } })
    );

    expect(execute).toHaveBeenCalledWith({ monitorIds: ['mon-path'] });
  });

  it('deletes every monitor id from the body of the collection route', async () => {
    const { execute } = installExecuteResult({ errors: [] });

    await deleteSyntheticsMonitorsRoute().handler(
      mockRouteContext({ body: { ids: ['mon-1', 'mon-2'] } })
    );

    expect(execute).toHaveBeenCalledWith({ monitorIds: ['mon-1', 'mon-2'] });
  });
});
