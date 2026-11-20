/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNightshiftSourcesServerRoute } from './create_server_route';

const SECURITY = { authz: { enabled: false as const, reason: 'test' } };

const call = (endpoint: string, handler: jest.Mock, spaceId: string) =>
  createNightshiftSourcesServerRoute({
    endpoint,
    options: { access: 'internal' },
    security: SECURITY,
    handler,
  } as never)[endpoint].handler({ request: { spaceId } } as never);

describe('createNightshiftSourcesServerRoute', () => {
  // Creating or changing a source installs enabled scheduled workflows through the source-change
  // hook, which is exactly what must not happen in a space Nightshift does not run in.
  it('refuses a source write outside the default space', async () => {
    const handler = jest.fn();

    await expect(call('POST /internal/nightshift/sources', handler, 'marketing')).rejects.toThrow(
      /only available in the "default" space/
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs a source write in the default space', async () => {
    const handler = jest.fn().mockResolvedValue('ok');

    await expect(call('POST /internal/nightshift/sources', handler, 'default')).resolves.toBe('ok');
  });

  it('leaves reads open in any space', async () => {
    const handler = jest.fn().mockResolvedValue('listed');

    await expect(call('GET /internal/nightshift/sources', handler, 'marketing')).resolves.toBe(
      'listed'
    );
  });

  // So a space set up on an earlier build can still get rid of the sources it was left with.
  it('leaves the source delete and disable open in any space, and still gates the update', async () => {
    const remove = jest.fn().mockResolvedValue('deleted');
    const disable = jest.fn().mockResolvedValue('disabled');
    const update = jest.fn();

    await expect(
      call('DELETE /internal/nightshift/sources/{sourceId}', remove, 'marketing')
    ).resolves.toBe('deleted');
    await expect(
      call('POST /internal/nightshift/sources/{sourceId}/_disable', disable, 'marketing')
    ).resolves.toBe('disabled');
    await expect(
      call('PUT /internal/nightshift/sources/{sourceId}', update, 'marketing')
    ).rejects.toThrow(/only available in the "default" space/);
    expect(update).not.toHaveBeenCalled();
  });
});
