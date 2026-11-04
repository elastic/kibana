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
  it('returns getTypes output', async () => {
    const response: GetTypesResponse = { types: [] };
    const getTypes = jest.fn().mockResolvedValue(response);
    const request = httpServerMock.createKibanaRequest();
    const getInventoryService = jest.fn().mockResolvedValue({ getTypes });

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

  it('declares internal access and opts out of authz with a reason', () => {
    expect(route).toEqual(
      expect.objectContaining({ options: expect.objectContaining({ access: 'internal' }) })
    );
    expect(route.security.authz).toEqual(
      expect.objectContaining({ enabled: false, reason: expect.stringContaining('#6244') })
    );
  });
});
