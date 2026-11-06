/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  InventoryRequestError,
  InventoryTypeDefinitionError,
  InventoryTypeNotFoundError,
} from '../inventory/errors';
import { createEntityInventoryServerRoute } from './create_server_route';
import { INTERIM_AUTHZ } from './interim_authz';

const callRouteThrowing = (error: Error): Promise<unknown> => {
  const route = createEntityInventoryServerRoute({
    endpoint: 'GET /internal/entity_inventory/test',
    options: { access: 'internal' },
    security: INTERIM_AUTHZ,
    handler: async () => {
      throw error;
    },
  })['GET /internal/entity_inventory/test'];

  return route.handler({
    request: httpServerMock.createKibanaRequest(),
    response: httpServerMock.createResponseFactory(),
    context: coreMock.createCustomRequestHandlerContext({}),
    logger: loggerMock.create(),
    getInventoryService: jest.fn(),
  });
};

describe('createEntityInventoryServerRoute', () => {
  it('turns InventoryTypeNotFoundError into a 404 with its message', async () => {
    await expect(
      callRouteThrowing(new InventoryTypeNotFoundError('k8s.pod'))
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 404,
        payload: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Entity type "k8s.pod" is not available in the entity inventory',
        },
      },
    });
  });

  it('turns InventoryRequestError into a 400 with its message', async () => {
    await expect(callRouteThrowing(new InventoryRequestError('bad limit'))).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: { statusCode: 400, error: 'Bad Request', message: 'bad limit' },
      },
    });
  });

  it('turns InventoryTypeDefinitionError into a 400 with its message', async () => {
    await expect(
      callRouteThrowing(new InventoryTypeDefinitionError('k8s.pod', 'no sources'))
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: { message: 'Entity type "k8s.pod" cannot be queried: no sources' },
      },
    });
  });

  it('leaves the stack out of the response body', async () => {
    await expect(
      callRouteThrowing(new InventoryTypeNotFoundError('k8s.pod'))
    ).rejects.toHaveProperty('output.payload', {
      statusCode: 404,
      error: 'Not Found',
      message: 'Entity type "k8s.pod" is not available in the entity inventory',
    });
  });

  it('rethrows any other error unchanged', async () => {
    const error = new Error('boom');
    await expect(callRouteThrowing(error)).rejects.toBe(error);
  });

  it('rethrows an unrelated error that carries a statusCode unchanged', async () => {
    const error = Object.assign(new Error('index_not_found'), { statusCode: 404 });
    await expect(callRouteThrowing(error)).rejects.toBe(error);
  });
});
