/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { nightshiftInvestigationsRouteRepository } from '.';
import { InvestigationNotFoundError } from '../client/errors';

const endpoint = 'POST /internal/nightshift/investigations/{id}/lifecycle_events' as const;
const { handler } = nightshiftInvestigationsRouteRepository[endpoint];
const mockRequest = {} as KibanaRequest;

const makeClient = (overrides: Record<string, unknown> = {}) => ({
  getLifecycleSubject: jest.fn().mockResolvedValue({
    subject: { type: 'alert', id: 'alert-1' },
    triggerType: 'manual',
    startedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }),
});

const makeResources = (
  emitter: jest.Mock | undefined,
  params: Record<string, unknown>,
  client?: Record<string, unknown>
) => ({
  request: mockRequest,
  params,
  getInvestigationsClient: jest.fn().mockReturnValue(client ?? makeClient()),
  getTriggerEmitter: jest.fn().mockReturnValue(emitter),
});

it('emits the started trigger with identity taken from the recorded subjects', async () => {
  const emitter = jest.fn();
  const resources = makeResources(emitter, {
    path: { id: 'inv-1' },
    body: { status: 'running' },
  });

  const result = await handler(resources as never);

  expect(result).toEqual({ accepted: true });
  expect(emitter).toHaveBeenCalledWith('nightshift-investigations.started', {
    investigation_id: 'inv-1',
    subject: { type: 'alert', id: 'alert-1' },
    trigger_type: 'manual',
    started_at: '2024-01-01T00:00:00Z',
    status: 'running',
  });
});

it('attributes the event to the trigger type recorded on the subject', async () => {
  const emitter = jest.fn();
  const client = makeClient({ triggerType: 'automatic' });
  const resources = makeResources(
    emitter,
    {
      path: { id: 'inv-1' },
      body: { status: 'running' },
    },
    client
  );

  await handler(resources as never);

  expect(client.getLifecycleSubject).toHaveBeenCalledWith('inv-1');
  expect(emitter).toHaveBeenCalledWith(
    'nightshift-investigations.started',
    expect.objectContaining({ trigger_type: 'automatic' })
  );
});

it('emits the completed trigger with a completed_at timestamp', async () => {
  const emitter = jest.fn();
  const resources = makeResources(emitter, {
    path: { id: 'inv-1' },
    body: { status: 'completed' },
  });

  const result = await handler(resources as never);

  expect(result).toEqual({ accepted: true });
  expect(emitter).toHaveBeenCalledWith(
    'nightshift-investigations.completed',
    expect.objectContaining({ status: 'completed', completed_at: expect.any(String) })
  );
});

it('emits the failed trigger when status is failed', async () => {
  const emitter = jest.fn();
  const resources = makeResources(emitter, {
    path: { id: 'inv-1' },
    body: { status: 'failed' },
  });

  const result = await handler(resources as never);

  expect(result).toEqual({ accepted: true });
  expect(emitter).toHaveBeenCalledWith(
    'nightshift-investigations.failed',
    expect.objectContaining({ status: 'failed', completed_at: expect.any(String) })
  );
});

it('does not emit when the investigation has no subject (bare workflow run)', async () => {
  const emitter = jest.fn();
  const client = makeClient();
  client.getLifecycleSubject.mockResolvedValue(undefined);
  const resources = makeResources(
    emitter,
    {
      path: { id: 'inv-1' },
      body: { status: 'completed' },
    },
    client
  );

  const result = await handler(resources as never);

  expect(result).toEqual({ accepted: false });
  expect(emitter).not.toHaveBeenCalled();
});

it('maps a missing investigation to 404', async () => {
  const client = makeClient();
  client.getLifecycleSubject.mockRejectedValue(new InvestigationNotFoundError('nope'));
  const resources = makeResources(
    jest.fn(),
    {
      path: { id: 'not-an-investigation' },
      body: { status: 'completed' },
    },
    client
  );

  await expect(handler(resources as never)).rejects.toMatchObject({
    output: { statusCode: 404 },
  });
});

it('is a no-op when no trigger emitter is available', async () => {
  const resources = makeResources(undefined, {
    path: { id: 'inv-1' },
    body: { status: 'completed' },
  });

  await expect(handler(resources as never)).resolves.toEqual({ accepted: false });
});
