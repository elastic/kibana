/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import { inspectableEsQueriesMap, withInspect } from './with_inspect';

const createMockResponse = () =>
  ({
    ok: vi.fn(({ body }) => ({ body, statusCode: 200 })),
    customError: vi.fn(({ statusCode, body }) => ({ statusCode, body })),
  } as unknown as KibanaResponseFactory);

const createMockRequest = (query: Record<string, unknown> = {}) =>
  ({ query } as unknown as KibanaRequest);

describe('withInspect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns handler response via response.ok()', async () => {
    const handler = vi.fn().mockResolvedValue({ hosts: [] });
    const wrapped = withInspect(handler);
    const request = createMockRequest();
    const response = createMockResponse();

    await wrapped({} as RequestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { hosts: [] } });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('includes _inspect data when _inspect=true', async () => {
    const handler = vi.fn().mockImplementation(async (_ctx, req) => {
      inspectableEsQueriesMap.get(req)?.push({ id: 'test-query' } as any);
      return { hosts: [] };
    });
    const wrapped = withInspect(handler);
    const request = createMockRequest({ _inspect: true });
    const response = createMockResponse();

    await wrapped({} as RequestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { hosts: [], _inspect: [{ id: 'test-query' }] },
    });
  });

  it('does not include _inspect data when _inspect is absent', async () => {
    const handler = vi.fn().mockImplementation(async (_ctx, req) => {
      inspectableEsQueriesMap.get(req)?.push({ id: 'test-query' } as any);
      return { hosts: [] };
    });
    const wrapped = withInspect(handler);
    const request = createMockRequest();
    const response = createMockResponse();

    await wrapped({} as RequestHandlerContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { hosts: [] } });
  });

  it('returns error with _inspect data on handler failure', async () => {
    const handler = vi.fn().mockImplementation(async (_ctx, req) => {
      inspectableEsQueriesMap.get(req)?.push({ id: 'failed-query' } as any);
      throw new Error('Something went wrong');
    });
    const wrapped = withInspect(handler);
    const request = createMockRequest({ _inspect: true });
    const response = createMockResponse();

    await wrapped({} as RequestHandlerContext, request, response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Something went wrong',
        attributes: { _inspect: [{ id: 'failed-query' }] },
      },
    });
  });

  it('cleans up the inspectableEsQueriesMap entry after handling', async () => {
    const handler = vi.fn().mockResolvedValue({});
    const wrapped = withInspect(handler);
    const request = createMockRequest();
    const response = createMockResponse();

    await wrapped({} as RequestHandlerContext, request, response);

    expect(inspectableEsQueriesMap.has(request)).toBe(false);
  });
});
