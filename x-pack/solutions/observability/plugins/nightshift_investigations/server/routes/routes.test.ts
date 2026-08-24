/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { InvestigationNotFoundError } from '../client/investigations_client';
import { nightshiftInvestigationsRouteRepository } from '.';

const startEndpoint = 'POST /internal/nightshift/investigations' as const;
const getEndpoint = 'GET /internal/nightshift/investigations/{id}' as const;

const mockRequest = {} as KibanaRequest;

const makeClient = (methods: { start?: jest.Mock; get?: jest.Mock }) => methods;

const makeResources = (client: ReturnType<typeof makeClient>, params: unknown) => ({
  request: mockRequest,
  params,
  getInvestigationsClient: jest.fn().mockReturnValue(client),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /internal/nightshift/investigations', () => {
  const { handler } = nightshiftInvestigationsRouteRepository[startEndpoint];

  it('returns investigation_id from client.start()', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'exec-123' });
    const resources = makeResources(makeClient({ start }), {
      body: { subject: { type: 'significant_event', id: 'se-1' } },
    });

    const result = await handler(resources as any);

    expect(start).toHaveBeenCalledWith({ subject: { type: 'significant_event', id: 'se-1' } });
    expect(result).toEqual({ investigation_id: 'exec-123' });
  });

  it('passes concurrency_key and context to client.start() when provided', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'exec-456' });
    const resources = makeResources(makeClient({ start }), {
      body: {
        subject: { type: 'alert', id: 'alert-1' },
        concurrency_key: 'alert-1',
        context: { rule_name: 'CPU high' },
      },
    });

    await handler(resources as any);

    expect(start).toHaveBeenCalledWith({
      subject: { type: 'alert', id: 'alert-1' },
      concurrency_key: 'alert-1',
      context: { rule_name: 'CPU high' },
    });
  });

  it('propagates errors from client.start()', async () => {
    const start = jest.fn().mockRejectedValue(new Error('Investigations are not configured'));
    const resources = makeResources(makeClient({ start }), {
      body: { subject: { type: 'alert', id: 'alert-1' } },
    });

    await expect(handler(resources as any)).rejects.toThrow('Investigations are not configured');
  });
});

describe('GET /internal/nightshift/investigations/{id}', () => {
  const { handler } = nightshiftInvestigationsRouteRepository[getEndpoint];

  it('returns the investigation from client.get()', async () => {
    const mockInvestigation = {
      investigation_id: 'exec-123',
      status: 'running',
      subject: { type: 'significant_event', id: 'se-1' },
      started_at: '2024-01-01T00:00:00Z',
    };
    const get = jest.fn().mockResolvedValue(mockInvestigation);
    const resources = makeResources(makeClient({ get }), { path: { id: 'exec-123' } });

    const result = await handler(resources as any);

    expect(get).toHaveBeenCalledWith('exec-123');
    expect(result).toEqual(mockInvestigation);
  });

  it('maps InvestigationNotFoundError to a Boom 404', async () => {
    const get = jest.fn().mockRejectedValue(new InvestigationNotFoundError('"exec-999" not found'));
    const resources = makeResources(makeClient({ get }), { path: { id: 'exec-999' } });

    await expect(handler(resources as any)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
    });
  });

  it('re-throws non-NotFound errors without wrapping them in Boom', async () => {
    const get = jest.fn().mockRejectedValue(new Error('workflowsManagement is not available'));
    const resources = makeResources(makeClient({ get }), { path: { id: 'exec-123' } });

    const caught = await handler(resources as any).catch((e) => e);

    expect(caught).toBeInstanceOf(Error);
    expect(caught.isBoom).toBeUndefined();
    expect(caught.message).toBe('workflowsManagement is not available');
  });
});

describe('POST /internal/nightshift/investigations/{id}/lifecycle_events', () => {
  const lifecycleEndpoint =
    'POST /internal/nightshift/investigations/{id}/lifecycle_events' as const;
  const { handler } = nightshiftInvestigationsRouteRepository[lifecycleEndpoint];

  const makeLifecycleResources = (
    emitter: jest.Mock | undefined,
    params: Record<string, unknown>
  ) => ({
    request: mockRequest,
    params,
    getInvestigationsClient: jest.fn(),
    getTriggerEmitter: jest.fn().mockReturnValue(emitter),
  });

  it('emits the completed trigger with the expected payload', async () => {
    const emitter = jest.fn();
    const resources = makeLifecycleResources(emitter, {
      path: { id: 'exec-1' },
      body: {
        status: 'completed',
        started_at: '2024-01-01T00:00:00Z',
        subject: { type: 'alert', id: 'alert-1' },
      },
    });

    const result = await handler(resources as any);

    expect(result).toEqual({ emitted: true });
    expect(emitter).toHaveBeenCalledWith('nightshift-investigations.completed', {
      investigation_id: 'exec-1',
      status: 'completed',
      subject: { type: 'alert', id: 'alert-1' },
      started_at: '2024-01-01T00:00:00Z',
      completed_at: expect.any(String),
    });
  });

  it('emits the failed trigger when status is failed', async () => {
    const emitter = jest.fn();
    const resources = makeLifecycleResources(emitter, {
      path: { id: 'exec-2' },
      body: {
        status: 'failed',
        started_at: '2024-01-01T00:00:00Z',
        subject: { type: 'significant_event', id: '' },
      },
    });

    const result = await handler(resources as any);

    expect(result).toEqual({ emitted: true });
    expect(emitter).toHaveBeenCalledWith('nightshift-investigations.failed', {
      investigation_id: 'exec-2',
      status: 'failed',
      subject: { type: 'significant_event', id: '' },
      started_at: '2024-01-01T00:00:00Z',
      completed_at: expect.any(String),
    });
  });

  it('is a no-op when no trigger emitter is available (workflowsExtensions absent)', async () => {
    const resources = makeLifecycleResources(undefined, {
      path: { id: 'exec-3' },
      body: {
        status: 'completed',
        started_at: '2024-01-01T00:00:00Z',
        subject: { type: 'alert', id: 'alert-2' },
      },
    });

    const result = await handler(resources as any);

    expect(result).toEqual({ emitted: false });
  });
});
