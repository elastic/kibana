/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSyntheticsParamRoute, deleteSyntheticsParamsRoute } from './delete_param';

jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn(),
}));

const mockRouteContext = (request: { body?: unknown; params?: unknown }) => {
  const bulkDelete = jest.fn().mockImplementation(async (objects: Array<{ id: string }>) => ({
    statuses: objects.map(({ id }) => ({ id, success: true })),
  }));
  const bulkGet = jest.fn().mockResolvedValue({ saved_objects: [] });
  return {
    bulkDelete,
    routeContext: {
      request,
      savedObjectsClient: { bulkDelete, bulkGet },
      server: {},
    } as any,
  };
};

describe('delete param routes', () => {
  it('deletes the param from the path param', async () => {
    const { bulkDelete, routeContext } = mockRouteContext({ params: { id: 'param-1' } });

    const result = await deleteSyntheticsParamRoute().handler(routeContext);

    expect(bulkDelete).toHaveBeenCalledWith([{ type: 'synthetics-param', id: 'param-1' }], {
      force: true,
    });
    expect(result).toEqual([{ id: 'param-1', deleted: true }]);
  });

  it('deletes every param id from the body of the collection route', async () => {
    const { bulkDelete, routeContext } = mockRouteContext({
      params: {},
      body: { ids: ['param-1', 'param-2'] },
    });

    const result = await deleteSyntheticsParamsRoute().handler(routeContext);

    expect(bulkDelete).toHaveBeenCalledWith(
      [
        { type: 'synthetics-param', id: 'param-1' },
        { type: 'synthetics-param', id: 'param-2' },
      ],
      { force: true }
    );
    expect(result).toEqual([
      { id: 'param-1', deleted: true },
      { id: 'param-2', deleted: true },
    ]);
  });
});
