/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { GetTypesResponse } from '../types';
import { typesRoute } from './route';

const route = typesRoute['GET /internal/entity_inventory/types'];

describe('GET /internal/entity_inventory/types', () => {
  it('is an internal route', () => {
    expect(route).toMatchObject({ options: { access: 'internal' } });
  });

  it('delegates authorization to the scoped Elasticsearch client', () => {
    expect(route.security).toStrictEqual({ authz: AuthzDisabled.delegateToESClient });
  });

  it('returns the types the inventory service lists for the request', async () => {
    const types: GetTypesResponse = { types: [] };
    const listTypes = jest.fn().mockResolvedValue(types);
    const getInventoryService = jest.fn().mockResolvedValue({ listTypes });
    const request = httpServerMock.createKibanaRequest();

    const response = await route.handler({
      request,
      response: httpServerMock.createResponseFactory(),
      context: coreMock.createCustomRequestHandlerContext({}),
      logger: loggerMock.create(),
      getInventoryService,
    });

    expect(getInventoryService).toHaveBeenCalledWith(request);
    expect(response).toBe(types);
  });
});
