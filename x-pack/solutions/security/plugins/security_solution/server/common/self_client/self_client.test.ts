/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createSelfClient } from './self_client';

const createMocks = () => {
  const mockCore = coreMock.createSetup();
  const mockLogger = loggingSystemMock.createLogger();
  const mockRequest = httpServerMock.createKibanaRequest();
  const mockFetch = jest.fn();
  const mockCoreStart = coreMock.createStart();
  (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
    fetch: mockFetch,
  });
  mockCore.getStartServices.mockResolvedValue([mockCoreStart, {}, {}]);
  return { mockCore, mockLogger, mockRequest, mockFetch, mockCoreStart };
};

describe('createSelfClient', () => {
  it('should default to access: internal, version: 1 and asResponse: true', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSelfClient = createSelfClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/some/route' },
      request: new Request('http://localhost/internal/some/route'),
      response: new Response(null, { status: 200 }),
      body: { migration_id: 'x' },
    });

    const result = await callSelfClient(mockRequest, '/internal/some/route');

    expect(mockFetch).toHaveBeenCalledWith('/internal/some/route', {
      access: 'internal',
      version: '1',
      asResponse: true,
    });
    expect(result).toEqual({ ok: true, status: 200, body: { migration_id: 'x' } });
  });

  it('should pass the fetch config through transparently', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSelfClient = createSelfClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/some/route/x/start' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { started: true },
    });

    await callSelfClient(mockRequest, '/internal/some/route/x/start', {
      method: 'POST',
      query: { foo: 'bar' },
      body: { settings: { connector_id: 'c1' } },
      headers: { 'x-custom': 'yes' },
      timeout: 5000,
      forwardRequestHeaders: true,
      prependBasePath: false,
    });

    expect(mockFetch).toHaveBeenCalledWith('/internal/some/route/x/start', {
      method: 'POST',
      query: { foo: 'bar' },
      body: { settings: { connector_id: 'c1' } },
      headers: { 'x-custom': 'yes' },
      timeout: 5000,
      forwardRequestHeaders: true,
      prependBasePath: false,
      access: 'internal',
      version: '1',
      asResponse: true,
    });
  });

  it('should allow overriding the access and version defaults', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSelfClient = createSelfClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/api/public' },
      request: new Request('http://localhost/api/public'),
      response: new Response(null, { status: 200 }),
      body: {},
    });

    await callSelfClient(mockRequest, '/api/public', {
      access: 'public',
      version: '2023-10-31',
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/public', {
      access: 'public',
      version: '2023-10-31',
      asResponse: true,
    });
  });

  it('should normalize a non-2xx HttpSelfFetchError into an ok: false result', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSelfClient = createSelfClient({ core: mockCore, logger: mockLogger });

    const error = new Error('Not Found') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 404 });
    error.body = { statusCode: 404, error: 'Not Found', message: 'Migration not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = await callSelfClient(mockRequest, '/internal/some/route/missing');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Migration not found',
      });
    }
  });

  it('should normalize a non-HttpSelfFetchError into an ok: false result with status 500', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSelfClient = createSelfClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await callSelfClient(mockRequest, '/internal/some/route/x');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.message).toBe('network down');
    }
  });
});
