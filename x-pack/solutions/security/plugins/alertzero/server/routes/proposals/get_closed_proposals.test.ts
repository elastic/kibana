/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { registerGetClosedProposalsRoute } from './get_closed_proposals';

const makeDeps = (conversationProposalsService: unknown) => {
  const addVersion = jest.fn();
  const router = {
    versioned: {
      get: jest.fn().mockReturnValue({ addVersion }),
    },
  };
  registerGetClosedProposalsRoute({
    router: router as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getConversationProposalsService: () => conversationProposalsService,
  } as unknown as RouteDependencies);

  const handler = addVersion.mock.calls[0][1] as (
    context: unknown,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  const validateQuery = (query: unknown) =>
    addVersion.mock.calls[0][0].validate.request.query(query, {
      ok: (value: unknown) => ({ value }),
      badRequest: (message: string) => ({ error: message }),
    });

  return { handler, validateQuery };
};

describe('registerGetClosedProposalsRoute', () => {
  it('delegates to listClosed with the correct size, from, and spaceId', async () => {
    const listClosed = jest.fn().mockResolvedValue({ proposals: [], total: 0 });
    const { handler } = makeDeps({ listClosed });
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        path: '/internal/alertzero/proposals/closed',
        query: { size: '25', from: '0' },
      }),
      response
    );

    expect(listClosed).toHaveBeenCalledWith(expect.anything(), 'default', {
      size: '25',
      from: '0',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { proposals: [], total: 0 } });
  });

  it('accepts size=0, so a collapsed accordion can read the total without the rows', () => {
    const { validateQuery } = makeDeps({ listClosed: jest.fn() });

    expect(validateQuery({ size: '0', from: '0' })).toEqual({ value: { size: 0, from: 0 } });
  });

  it('returns the group total on a size=0 page', async () => {
    const listClosed = jest.fn().mockResolvedValue({ proposals: [], total: 42 });
    const { handler } = makeDeps({ listClosed });
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ query: { size: 0, from: 0 } }),
      response
    );

    expect(response.ok).toHaveBeenCalledWith({ body: { proposals: [], total: 42 } });
  });

  it('rejects a negative size', () => {
    const { validateQuery } = makeDeps({ listClosed: jest.fn() });

    expect(validateQuery({ size: '-1', from: '0' })).toEqual({ error: expect.any(String) });
  });

  it('returns 500 when listClosed throws', async () => {
    const { handler } = makeDeps({
      listClosed: jest.fn().mockRejectedValue(new Error('ES down')),
    });
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({
        query: { size: '25', from: '0' },
      }),
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to get closed proposals' },
    });
  });
});
