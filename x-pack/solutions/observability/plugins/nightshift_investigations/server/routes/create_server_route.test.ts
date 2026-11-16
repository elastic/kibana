/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const SECURITY = { authz: { enabled: false as const, reason: 'test' } };

const route = (endpoint: string, handler: jest.Mock) =>
  createNightshiftInvestigationsServerRoute({
    endpoint,
    options: { access: 'internal' },
    security: SECURITY,
    handler,
  } as never)[endpoint];

const call = (endpoint: string, handler: jest.Mock, spaceId: string) =>
  route(endpoint, handler).handler({ request: { spaceId } } as never);

describe('createNightshiftInvestigationsServerRoute', () => {
  it('refuses a write outside the default space before the handler runs', async () => {
    const handler = jest.fn();

    await expect(
      call('POST /internal/nightshift/investigations/_start', handler, 'marketing')
    ).rejects.toThrow(/only available in the "default" space/);
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a write in the default space', async () => {
    const handler = jest.fn().mockResolvedValue('ok');

    await expect(
      call('POST /internal/nightshift/investigations/_start', handler, 'default')
    ).resolves.toBe('ok');
  });

  // Reads stay open so a space set up on an earlier build can still be looked at, and the service
  // account disable is how that setup is taken back down.
  it('leaves reads and the service account disable open in any space', async () => {
    const read = jest.fn().mockResolvedValue('read');
    const disable = jest.fn().mockResolvedValue('disabled');

    await expect(call('GET /internal/nightshift/investigations', read, 'marketing')).resolves.toBe(
      'read'
    );
    await expect(
      call(
        'POST /internal/nightshift/investigations/service_account/_disable',
        disable,
        'marketing'
      )
    ).resolves.toBe('disabled');
  });
});
