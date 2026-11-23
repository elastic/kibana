/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { deleteSyntheticsParamRoute, deleteSyntheticsParamsRoute } from './delete_param';
import { deleteSyntheticsParamsBulkRoute } from './delete_params_bulk';

jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn(),
}));

const mockRouteContext = (
  request: { body?: unknown; params?: unknown },
  {
    spaceId = 'default',
    savedObjects = [],
    internalSavedObjects,
    hasAllRequested,
  }: {
    spaceId?: string;
    savedObjects?: Array<{ id: string; attributes?: { key: string }; namespaces?: string[] }>;
    internalSavedObjects?: Array<{
      id: string;
      attributes?: { key: string };
      namespaces?: string[];
    }>;
    hasAllRequested?: boolean;
  } = {}
) => {
  const bulkDelete = jest.fn().mockImplementation(async (objects: Array<{ id: string }>) => ({
    statuses: objects.map(({ id }) => ({ id, success: true })),
  }));
  const bulkGet = jest.fn().mockResolvedValue({ saved_objects: savedObjects });
  const internalBulkGet = jest.fn().mockResolvedValue({ saved_objects: internalSavedObjects });
  const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
  const response = httpServerMock.createResponseFactory();
  return {
    bulkDelete,
    checkPrivileges,
    response,
    routeContext: {
      request,
      response,
      spaceId,
      savedObjectsClient: { bulkDelete, bulkGet },
      server: {
        ...(internalSavedObjects
          ? {
              coreStart: {
                savedObjects: { createInternalRepository: () => ({ bulkGet: internalBulkGet }) },
              },
            }
          : {}),
        ...(hasAllRequested !== undefined
          ? {
              security: {
                authz: { checkSavedObjectsPrivilegesWithRequest: () => checkPrivileges },
              },
            }
          : {}),
      },
    } as any,
  };
};

describe('delete param routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it.each([
    ['DELETE /params/{id}', () => deleteSyntheticsParamRoute(), { params: { id: 'p1' } }],
    ['DELETE /params', () => deleteSyntheticsParamsRoute(), { params: {}, body: { ids: ['p1'] } }],
    [
      'POST /params/_bulk_delete',
      () => deleteSyntheticsParamsBulkRoute(),
      { params: {}, body: { ids: ['p1'] } },
    ],
  ])(
    '%s rejects deleting an all-spaces (*) param without global privilege',
    async (_n, route, req) => {
      const { bulkDelete, checkPrivileges, response, routeContext } = mockRouteContext(req, {
        spaceId: 'space-a',
        savedObjects: [{ id: 'p1', attributes: { key: 'K' }, namespaces: ['?'] }],
        internalSavedObjects: [{ id: 'p1', attributes: { key: 'K' }, namespaces: ['*'] }],
        hasAllRequested: false,
      });

      await route().handler(routeContext);

      expect(checkPrivileges).toHaveBeenCalledWith('saved_object:synthetics-param/bulk_delete', [
        '*',
      ]);
      expect(response.forbidden).toHaveBeenCalledTimes(1);
      expect(bulkDelete).not.toHaveBeenCalled();
      expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
    }
  );

  it('allows deleting a shared param with global privilege and skips check for active-space param', async () => {
    const shared = mockRouteContext(
      { params: { id: 'p1' } },
      {
        spaceId: 'space-a',
        internalSavedObjects: [{ id: 'p1', attributes: { key: 'K' }, namespaces: ['*'] }],
        hasAllRequested: true,
      }
    );
    await deleteSyntheticsParamRoute().handler(shared.routeContext);
    expect(shared.bulkDelete).toHaveBeenCalledTimes(1);

    const local = mockRouteContext(
      { params: { id: 'p2' } },
      {
        spaceId: 'space-a',
        internalSavedObjects: [{ id: 'p2', attributes: { key: 'L' }, namespaces: ['space-a'] }],
        hasAllRequested: false,
      }
    );
    await deleteSyntheticsParamRoute().handler(local.routeContext);
    expect(local.checkPrivileges).not.toHaveBeenCalled();
    expect(local.bulkDelete).toHaveBeenCalledTimes(1);
  });
});
