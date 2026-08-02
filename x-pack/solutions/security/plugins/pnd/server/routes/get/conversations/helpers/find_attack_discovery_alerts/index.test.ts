/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { ATTACK_DISCOVERY_FIND } from '@kbn/elastic-assistant-common';

import { scopedSelfGet } from '../scoped_self_get';
import { FIND_ATTACK_DISCOVERY_ALERTS_MAX, findAttackDiscoveryAlerts } from '.';

jest.mock('../scoped_self_get');

const scopedSelfGetMock = scopedSelfGet as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

describe('findAttackDiscoveryAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfGetMock.mockResolvedValue({ body: { data: [{ id: 'ad-1' }] }, status: 200 });
  });

  it('resolves the discoveries as the calling user via the AD find route (S3)', async () => {
    await findAttackDiscoveryAlerts({ http, ids: ['ad-1'], request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, path: ATTACK_DISCOVERY_FIND, request, spaceId: 'agent-3' })
    );
  });

  it('passes the requested ids through to the find query', async () => {
    await findAttackDiscoveryAlerts({ http, ids: ['ad-1', 'ad-2'], request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ ids: ['ad-1', 'ad-2'] }) })
    );
  });

  it('omits the ids filter when none are provided', async () => {
    await findAttackDiscoveryAlerts({ http, request, spaceId: 'agent-3' });

    const { query } = scopedSelfGetMock.mock.calls[0][0];
    expect(query.ids).toBeUndefined();
  });

  it('bounds the page size to the shared maximum', async () => {
    await findAttackDiscoveryAlerts({ http, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ per_page: FIND_ATTACK_DISCOVERY_ALERTS_MAX }),
      })
    );
  });

  it('asks _find for every author the caller is allowed to read', async () => {
    await findAttackDiscoveryAlerts({ http, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ include_all_authors: true }),
      })
    );
  });

  it('returns the discoveries from the response data', async () => {
    const result = await findAttackDiscoveryAlerts({ http, ids: ['ad-1'], request, spaceId: 'a' });

    expect(result).toEqual([{ id: 'ad-1' }]);
  });

  it('returns an empty array when the caller cannot read the discovery', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 403 });

    const result = await findAttackDiscoveryAlerts({ http, ids: ['ad-1'], request, spaceId: 'a' });

    expect(result).toEqual([]);
  });

  it('returns an empty array when the discovery does not exist', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 404 });

    const result = await findAttackDiscoveryAlerts({ http, ids: ['ad-1'], request, spaceId: 'a' });

    expect(result).toEqual([]);
  });

  it('returns an empty array when the response has no data', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: {}, status: 200 });

    const result = await findAttackDiscoveryAlerts({ http, ids: ['ad-1'], request, spaceId: 'a' });

    expect(result).toEqual([]);
  });
});
