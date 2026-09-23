/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSingleEntity } from '../entity_resolution';
import { resolveEntityIdsForResolution } from './resolve_entity_ids';

jest.mock('../entity_resolution', () => ({
  resolveSingleEntity: jest.fn(),
}));

const mockResolveSingleEntity = resolveSingleEntity as jest.Mock;

const baseParams = { esClient: {} as never, spaceId: 'default' };

describe('resolveEntityIdsForResolution', () => {
  beforeEach(() => {
    mockResolveSingleEntity.mockReset();
  });

  it('substitutes the canonical entity.id for resolved references', async () => {
    mockResolveSingleEntity
      .mockResolvedValueOnce({
        status: 'resolved',
        identity: { identifierType: 'user', identifier: 'jsmith', entityStoreId: 'user:jsmith' },
      })
      .mockResolvedValueOnce({
        status: 'resolved',
        identity: { identifierType: 'host', identifier: 'server1', entityStoreId: 'host:server1' },
      });

    const result = await resolveEntityIdsForResolution({
      ...baseParams,
      entityIds: ['jsmith', 'server1'],
    });

    expect(result.euids).toHaveLength(2);
    expect(result.euids).toEqual(expect.arrayContaining(['user:jsmith', 'host:server1']));
    expect(result.unresolved).toEqual([]);
  });

  it('excludes the reference from euids, reporting it as unresolved, when not_found', async () => {
    mockResolveSingleEntity.mockResolvedValueOnce({ status: 'not_found' });

    const result = await resolveEntityIdsForResolution({ ...baseParams, entityIds: ['ghost'] });

    expect(result.euids).toEqual([]);
    expect(result.unresolved).toEqual([{ entityId: 'ghost', status: 'not_found' }]);
  });

  it('excludes the reference from euids when ambiguous and includes the candidates', async () => {
    mockResolveSingleEntity.mockResolvedValueOnce({
      status: 'ambiguous',
      matchCount: 2,
      candidateEntityIds: ['host:server1', 'host:server10'],
    });

    const result = await resolveEntityIdsForResolution({ ...baseParams, entityIds: ['server'] });

    expect(result.euids).toEqual([]);
    expect(result.unresolved).toEqual([
      {
        entityId: 'server',
        status: 'ambiguous',
        matchCount: 2,
        candidateEntityIds: ['host:server1', 'host:server10'],
      },
    ]);
  });

  it('excludes the reference from euids when resolved but missing an entityStoreId', async () => {
    mockResolveSingleEntity.mockResolvedValueOnce({
      status: 'resolved',
      identity: { identifierType: 'host', identifier: 'server1' },
    });

    const result = await resolveEntityIdsForResolution({ ...baseParams, entityIds: ['server1'] });

    expect(result.euids).toEqual([]);
    expect(result.unresolved).toEqual([{ entityId: 'server1', status: 'resolved' }]);
  });

  it('resolves each id independently, mixing resolved and unresolved outcomes', async () => {
    mockResolveSingleEntity
      .mockResolvedValueOnce({
        status: 'resolved',
        identity: { identifierType: 'user', identifier: 'jsmith', entityStoreId: 'user:jsmith' },
      })
      .mockResolvedValueOnce({ status: 'not_found' });

    const result = await resolveEntityIdsForResolution({
      ...baseParams,
      entityIds: ['jsmith', 'ghost'],
    });

    expect(result.euids).toEqual(['user:jsmith']);
    expect(result.unresolved).toEqual([{ entityId: 'ghost', status: 'not_found' }]);
  });
});
