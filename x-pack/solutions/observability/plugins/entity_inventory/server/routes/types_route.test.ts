/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { GetTypesResponse } from '../inventory/types';
import { typesRoute } from './types_route';

const route = typesRoute['GET /internal/entity_inventory/types'];

describe('typesRoute', () => {
  it('returns listTypes output', async () => {
    const response: GetTypesResponse = { types: [] };
    const listTypes = jest.fn().mockResolvedValue(response);
    const request = httpServerMock.createKibanaRequest();
    const getInventoryService = jest.fn().mockResolvedValue({ listTypes });

    const result = await route.handler({
      request,
      response: httpServerMock.createResponseFactory(),
      context: coreMock.createCustomRequestHandlerContext({}),
      logger: loggerMock.create(),
      getInventoryService,
    });

    expect(getInventoryService).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });

  it('declares internal access', () => {
    expect(route.options).toEqual(expect.objectContaining({ access: 'internal' }));
  });

  it('requires the entity inventory read privilege', () => {
    expect(route.security).toEqual({
      authz: { requiredPrivileges: ['entity_inventory_read'] },
    });
  });
});
