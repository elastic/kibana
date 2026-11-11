/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLORepositoryClient } from '../types';
import { createUnwrappingSloClient } from './unwrap_slo_client';

describe('createUnwrappingSloClient', () => {
  const createSloClient = (response: unknown): SLORepositoryClient =>
    ({
      fetch: jest.fn().mockResolvedValue(response),
      stream: jest.fn(),
    } as unknown as SLORepositoryClient);

  const fetch = (client: SLORepositoryClient) =>
    client.fetch('POST /internal/observability/slos/_historical_summary' as any, {} as any);

  it('unwraps an array response wrapped in `{ _wrapped, _inspect }`', async () => {
    const data = [{ sloId: 'slo-1', instanceId: '*', data: [] }];
    const client = createUnwrappingSloClient(createSloClient({ _wrapped: data, _inspect: [{}] }));

    await expect(fetch(client)).resolves.toEqual(data);
  });

  it('strips `_inspect` from an object response', async () => {
    const client = createUnwrappingSloClient(
      createSloClient({ id: 'slo-1', name: 'My SLO', _inspect: [{}] })
    );

    await expect(fetch(client)).resolves.toEqual({ id: 'slo-1', name: 'My SLO' });
  });

  it('returns an unwrapped array response untouched', async () => {
    const data = [{ sloId: 'slo-1', instanceId: '*', data: [] }];
    const client = createUnwrappingSloClient(createSloClient(data));

    await expect(fetch(client)).resolves.toBe(data);
  });

  it('returns an object response without inspection envelope untouched', async () => {
    const data = { id: 'slo-1', name: 'My SLO' };
    const client = createUnwrappingSloClient(createSloClient(data));

    await expect(fetch(client)).resolves.toBe(data);
  });

  it('does not unwrap when only `_wrapped` is present without `_inspect`', async () => {
    const response = { _wrapped: [{ id: 'slo-1' }] };
    const client = createUnwrappingSloClient(createSloClient(response));

    await expect(fetch(client)).resolves.toBe(response);
  });

  it.each([undefined, null])('passes through a %s response', async (response) => {
    const client = createUnwrappingSloClient(createSloClient(response));

    await expect(fetch(client)).resolves.toBe(response);
  });

  it('forwards the underlying stream implementation', () => {
    const sloClient = createSloClient([]);
    const client = createUnwrappingSloClient(sloClient);

    expect(client.stream).toBe(sloClient.stream);
  });
});
