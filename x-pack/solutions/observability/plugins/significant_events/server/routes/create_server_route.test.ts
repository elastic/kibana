/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRoute } from './create_server_route';

const SECURITY = { authz: { enabled: false as const, reason: 'test' } };

const call = (endpoint: string, handler: jest.Mock, spaceId: string) =>
  createServerRoute({
    endpoint,
    options: { access: 'internal' },
    security: SECURITY,
    handler,
  } as never)[endpoint].handler({ request: { spaceId } } as never);

describe('createServerRoute space gate', () => {
  it('refuses a write outside the default space before the handler runs', async () => {
    const handler = jest.fn();

    await expect(
      call('POST /internal/streams/{sourceId}/onboarding/_execute', handler, 'marketing')
    ).rejects.toThrow(/only available in the "default" space/);
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a write in the default space', async () => {
    const handler = jest.fn().mockResolvedValue('ok');

    await expect(
      call('POST /internal/streams/{sourceId}/onboarding/_execute', handler, 'default')
    ).resolves.toBe('ok');
  });

  // Reads stay open so a space set up on an earlier build can still be looked at, and pause and
  // reset are how it is taken back down.
  it('leaves reads, the maintenance pause and the reset open in any space', async () => {
    const read = jest.fn().mockResolvedValue('read');
    const pause = jest.fn().mockResolvedValue('paused');
    const reset = jest.fn().mockResolvedValue('reset');

    await expect(call('GET /internal/significant_events/events', read, 'marketing')).resolves.toBe(
      'read'
    );
    await expect(
      call('POST /internal/significant_events/maintenance/_pause', pause, 'marketing')
    ).resolves.toBe('paused');
    await expect(
      call('POST /internal/significant_events/maintenance/_reset', reset, 'marketing')
    ).resolves.toBe('reset');
  });
});
