/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { findAttackDiscoveryAlerts } from '../find_attack_discovery_alerts';
import { resolveReadableAttackDiscoveryAlertIds } from '.';

jest.mock('../find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = { id: 'request' } as unknown as KibanaRequest;

const invoke = (correlationIds: readonly string[]) =>
  resolveReadableAttackDiscoveryAlertIds({
    correlationIds,
    http,
    request,
    spaceId: 'agent-3',
  });

describe('resolveReadableAttackDiscoveryAlertIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
  });

  it('returns the ids the caller can read', async () => {
    expect(await invoke(['ad-1', 'ad-secret'])).toEqual(new Set(['ad-1']));
  });

  it('resolves the discoveries as the calling user, in the request space (S3/S9)', async () => {
    await invoke(['ad-1']);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith({
      http,
      ids: ['ad-1'],
      request,
      spaceId: 'agent-3',
    });
  });

  it('de-duplicates the ids it asks about', async () => {
    await invoke(['ad-1', 'ad-1']);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'] })
    );
  });

  it('drops empty ids before asking', async () => {
    await invoke(['', 'ad-1']);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'] })
    );
  });

  it('never calls the find route when there is nothing to check', async () => {
    await invoke(['']);

    expect(findAttackDiscoveryAlertsMock).not.toHaveBeenCalled();
  });

  it('returns an empty set when there is nothing to check', async () => {
    expect(await invoke([])).toEqual(new Set());
  });

  it('returns an empty set when the caller can read none of them', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    expect(await invoke(['ad-1'])).toEqual(new Set());
  });
});
