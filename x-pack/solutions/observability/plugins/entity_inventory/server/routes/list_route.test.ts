/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { InventoryTypeDefinitionError, InventoryTypeNotFoundError } from '../inventory/errors';
import type { ListResponse } from '../inventory/types';
import { INTERIM_AUTHZ } from './interim_authz';
import { listRoute } from './list_route';
import { MAX_TIME_RANGE_MS } from './time_range_guardrail';

const route = listRoute['POST /internal/entity_inventory/entities/{type}/list'];

const FROM = '2026-11-01T00:00:00.000Z';
const TO = '2026-11-01T01:00:00.000Z';

const callRoute = (
  list: jest.Mock,
  body: { from: string; to: string; limit: number } = { from: FROM, to: TO, limit: 50 }
) => {
  const request = httpServerMock.createKibanaRequest();
  const getInventoryService = jest.fn().mockResolvedValue({ list });
  const result = route.handler({
    request,
    response: httpServerMock.createResponseFactory(),
    context: coreMock.createCustomRequestHandlerContext({}),
    logger: loggerMock.create(),
    getInventoryService,
    params: { path: { type: 'k8s.deployment' }, body },
  });
  return { result, request, getInventoryService };
};

describe('listRoute', () => {
  it('lists the type from the path over the window and limit from the body', async () => {
    const response: Partial<ListResponse> = { rows: [] };
    const list = jest.fn().mockResolvedValue(response);

    const { result, request, getInventoryService } = callRoute(list);

    await expect(result).resolves.toBe(response);
    expect(getInventoryService).toHaveBeenCalledWith(request);
    expect(list).toHaveBeenCalledWith({
      type: 'k8s.deployment',
      window: { from: FROM, to: TO },
      limit: 50,
    });
  });

  it('declares internal access and the shared interim authz', () => {
    expect(route).toEqual(
      expect.objectContaining({ options: expect.objectContaining({ access: 'internal' }) })
    );
    expect(route.security).toBe(INTERIM_AUTHZ);
  });

  it('answers 400 with a message and no stack for a window over 72 hours, without listing', async () => {
    const list = jest.fn();
    const to = new Date(Date.parse(FROM) + MAX_TIME_RANGE_MS + 1).toISOString();

    const { result } = callRoute(list, { from: FROM, to, limit: 50 });

    await expect(result).rejects.toHaveProperty('output.payload', {
      statusCode: 400,
      error: 'Bad Request',
      message: `the time range from ${FROM} to ${to} is longer than the maximum of 72 hours`,
    });
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Not Found', new InventoryTypeNotFoundError('k8s.deployment')],
    [400, 'Bad Request', new InventoryTypeDefinitionError('k8s.deployment', 'no sources')],
  ])(
    'answers %i with a message and no stack for a service error',
    async (statusCode, error, thrown) => {
      const list = jest.fn().mockRejectedValue(thrown);

      const { result } = callRoute(list);

      await expect(result).rejects.toHaveProperty('output.payload', {
        statusCode,
        error,
        message: thrown.message,
      });
    }
  );
});
