/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createSiemMigrationClient } from './self_client';

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

describe('createSiemMigrationClient', () => {
  it('calls the internal endpoint with access: internal and asResponse: true', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSiemMigration = createSiemMigrationClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/x' },
      request: new Request('http://localhost/internal/siem_migrations/rules/x'),
      response: new Response(null, { status: 200 }),
      body: { migration_id: 'x' },
    });

    const result = await callSiemMigration(mockRequest, '/internal/siem_migrations/rules/x');

    expect(mockFetch).toHaveBeenCalledWith('/internal/siem_migrations/rules/x', {
      method: 'GET',
      query: undefined,
      body: undefined,
      access: 'internal',
      version: '1',
      asResponse: true,
    });
    expect(result).toEqual({ ok: true, status: 200, body: { migration_id: 'x' } });
  });

  it('forwards method, query and body', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSiemMigration = createSiemMigrationClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockResolvedValueOnce({
      fetchOptions: { path: '/internal/siem_migrations/rules/x/start' },
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { started: true },
    });

    await callSiemMigration(mockRequest, '/internal/siem_migrations/rules/x/start', {
      method: 'POST',
      query: { foo: 'bar' },
      body: { settings: { connector_id: 'c1' } },
    });

    expect(mockFetch).toHaveBeenCalledWith('/internal/siem_migrations/rules/x/start', {
      method: 'POST',
      query: { foo: 'bar' },
      body: { settings: { connector_id: 'c1' } },
      access: 'internal',
      version: '1',
      asResponse: true,
    });
  });

  it('normalizes a non-2xx HttpSelfFetchError into an ok: false result', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSiemMigration = createSiemMigrationClient({ core: mockCore, logger: mockLogger });

    const error = new Error('Not Found') as Error & {
      response?: Response;
      body?: unknown;
    };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 404 });
    error.body = { message: 'Migration not found' };
    mockFetch.mockRejectedValueOnce(error);

    const result = await callSiemMigration(mockRequest, '/internal/siem_migrations/rules/missing');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.body).toEqual({ message: 'Migration not found' });
    }
  });

  it('normalizes a non-HttpSelfFetchError into an ok: false result with status 500', async () => {
    const { mockCore, mockLogger, mockRequest, mockFetch } = createMocks();
    const callSiemMigration = createSiemMigrationClient({ core: mockCore, logger: mockLogger });

    mockFetch.mockRejectedValueOnce(new Error('network down'));

    const result = await callSiemMigration(mockRequest, '/internal/siem_migrations/rules/x');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.message).toBe('network down');
    }
  });
});
