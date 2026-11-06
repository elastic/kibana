/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { InventoryTypeDefinitionError, InventoryTypeNotFoundError } from '../../inventory/errors';
import type { ListResponse } from '../../inventory/types';
import { INTERIM_AUTHZ } from '../interim_authz';
import { listRoute } from './route';
import { MAX_TIME_RANGE_MS } from '../utils/time_range_guardrail';

const route = listRoute['GET /internal/entity_inventory/entities/{type}/list'];

const FROM = '2026-11-01T00:00:00.000Z';
const TO = '2026-11-01T01:00:00.000Z';

const callRoute = (
  list: jest.Mock,
  query: { from: string; to: string; limit: number } = { from: FROM, to: TO, limit: 50 }
) => {
  const request = httpServerMock.createKibanaRequest();
  const getInventoryService = jest.fn().mockResolvedValue({ list });
  const result = route.handler({
    request,
    response: httpServerMock.createResponseFactory(),
    context: coreMock.createCustomRequestHandlerContext({}),
    logger: loggerMock.create(),
    getInventoryService,
    params: { path: { type: 'k8s.deployment' }, query },
  });
  return { result, request, getInventoryService };
};

describe('listRoute', () => {
  it('lists the type from the path over the window and limit from the query', async () => {
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

describe('listRoute params', () => {
  const parse = (query: Record<string, unknown>) =>
    route.params.safeParse({ path: { type: 'k8s.deployment' }, query });

  it('defaults limit to 9,999', () => {
    expect(parse({ from: FROM, to: TO })).toMatchObject({
      success: true,
      data: { path: { type: 'k8s.deployment' }, query: { from: FROM, to: TO, limit: 9999 } },
    });
  });

  it('accepts limit as the numeric string a query string carries', () => {
    expect(parse({ from: FROM, to: TO, limit: '10' })).toMatchObject({
      success: true,
      data: { query: { limit: 10 } },
    });
  });

  it.each([1, 9999])('accepts limit %i', (limit) => {
    expect(parse({ from: FROM, to: TO, limit })).toMatchObject({
      success: true,
      data: { query: { limit } },
    });
  });

  it.each([
    ['0', 0],
    ['10,000', 10_000],
    ['a fraction', 1.5],
    ['a non-numeric string', 'ten'],
    ['an empty string', ''],
  ])('rejects limit %s', (_label, limit) => {
    expect(parse({ from: FROM, to: TO, limit }).success).toBe(false);
  });

  it('accepts an offset other than Z', () => {
    expect(parse({ from: '2026-11-01T01:00:00+02:00', to: TO }).success).toBe(true);
  });

  it.each([
    ['an invalid from', { from: 'yesterday', to: TO }],
    ['an invalid to', { from: FROM, to: '2026-13-01T00:00:00Z' }],
    ['a date without a time', { from: '2026-11-01', to: TO }],
    ['a missing from', { to: TO }],
    ['a missing to', { from: FROM }],
    ['a non-string from', { from: 1, to: TO }],
    ['a from over the length bound', { from: `${FROM}${'0'.repeat(64)}`, to: TO }],
  ])('rejects %s', (_label, query) => {
    expect(parse(query).success).toBe(false);
  });

  it.each([
    ['from equal to to', { from: FROM, to: FROM }],
    ['from after to', { from: TO, to: FROM }],
  ])('rejects %s with a message naming both bounds', (_label, query) => {
    const result = parse(query);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      'from must be earlier than to',
    ]);
  });

  it('rejects a malformed type in the path', () => {
    expect(
      route.params.safeParse({ path: { type: 'K8S' }, query: { from: FROM, to: TO } }).success
    ).toBe(false);
  });
});
