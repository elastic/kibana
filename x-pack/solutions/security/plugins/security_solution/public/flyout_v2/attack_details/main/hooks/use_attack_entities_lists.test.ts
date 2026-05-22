/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAttackEntitiesLists } from './use_attack_entities_lists';
import { useHeaderData } from './use_header_data';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';

const hit: DataTableRecord = {
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts', _source: {} },
  flattened: {},
};

jest.mock('@kbn/entity-store/public', () => {
  const actual = jest.requireActual('@kbn/entity-store/public');
  const { euid } = jest.requireActual('@kbn/entity-store/common/euid_helpers');
  return {
    ...actual,
    useEntityStoreEuidApi: jest.fn(() => ({ euid })),
  };
});

jest.mock('./use_header_data', () => ({
  useHeaderData: jest.fn(),
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));

const mockHeaderData = (originalAlertIds: string[]) =>
  ({ originalAlertIds } as unknown as ReturnType<typeof useHeaderData>);

describe('useAttackEntitiesLists', () => {
  const mockUseHeaderData = jest.mocked(useHeaderData);
  const mockUseQueryAlerts = jest.mocked(useQueryAlerts);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHeaderData.mockReturnValue(mockHeaderData([]));
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: null,
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });
  });

  it('returns empty lists and skips query when alertIds is empty', () => {
    mockUseHeaderData.mockReturnValue(mockHeaderData([]));

    const { result } = renderHook(() => useAttackEntitiesLists(hit));

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
    expect(result.current.userEntityIdentifiers).toEqual([]);
    expect(result.current.hostEntityIdentifiers).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('passes query with ids filter, EUID runtime_mappings and terms aggs when alertIds exist', () => {
    mockUseHeaderData.mockReturnValue(mockHeaderData(['id1', 'id2']));

    renderHook(() => useAttackEntitiesLists(hit));

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
        query: expect.objectContaining({
          query: { ids: { values: ['id1', 'id2'] } },
          size: 0,
          runtime_mappings: expect.objectContaining({
            attack_entities_euid_user: expect.any(Object),
            attack_entities_euid_host: expect.any(Object),
          }),
          aggs: expect.objectContaining({
            unique_users_by_euid: expect.objectContaining({
              terms: expect.objectContaining({
                field: 'attack_entities_euid_user',
                size: 200,
              }),
              aggs: expect.objectContaining({
                sample: expect.objectContaining({
                  top_hits: expect.objectContaining({ size: 1 }),
                }),
              }),
            }),
            unique_hosts_by_euid: expect.objectContaining({
              terms: expect.objectContaining({
                field: 'attack_entities_euid_host',
                size: 200,
              }),
              aggs: expect.objectContaining({
                sample: expect.objectContaining({
                  top_hits: expect.objectContaining({ size: 1 }),
                }),
              }),
            }),
          }),
        }),
      })
    );
  });

  it('parses userEntityIdentifiers and hostEntityIdentifiers from EUID aggregation buckets with sample _source', () => {
    mockUseHeaderData.mockReturnValue(mockHeaderData(['id1']));
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        took: 0,
        timeout: false,
        aggregations: {
          unique_users_by_euid: {
            buckets: [
              {
                key: 'user:user1',
                doc_count: 2,
                sample: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          user: { name: 'user1' },
                          host: { id: 'host-for-user1' },
                        },
                      },
                    ],
                  },
                },
              },
              {
                key: 'user:user2',
                doc_count: 1,
                sample: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          user: { name: 'user2' },
                          host: { id: 'host-for-user2' },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          unique_hosts_by_euid: {
            buckets: [
              {
                key: 'host:host1',
                doc_count: 3,
                sample: {
                  hits: {
                    hits: [{ _source: { host: { name: 'host1' } } }],
                  },
                },
              },
              {
                key: 'host:host2',
                doc_count: 1,
                sample: {
                  hits: {
                    hits: [{ _source: { host: { name: 'host2' } } }],
                  },
                },
              },
            ],
          },
        },
      },
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });

    const { result } = renderHook(() => useAttackEntitiesLists(hit));

    expect(result.current.userEntityIdentifiers).toEqual([
      {
        'user.name': 'user1',
        'host.id': 'host-for-user1',
        'entity.namespace': 'local',
      },
      {
        'user.name': 'user2',
        'host.id': 'host-for-user2',
        'entity.namespace': 'local',
      },
    ]);
    expect(result.current.hostEntityIdentifiers).toEqual([
      { 'host.name': 'host1' },
      { 'host.name': 'host2' },
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('returns empty arrays when aggregations are missing', () => {
    mockUseHeaderData.mockReturnValue(mockHeaderData(['id1']));
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        took: 0,
        timeout: false,
        aggregations: {},
      },
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });

    const { result } = renderHook(() => useAttackEntitiesLists(hit));

    expect(result.current.userEntityIdentifiers).toEqual([]);
    expect(result.current.hostEntityIdentifiers).toEqual([]);
  });

  it('skips buckets with missing or invalid sample _source', () => {
    mockUseHeaderData.mockReturnValue(mockHeaderData(['id1']));
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        took: 0,
        timeout: false,
        aggregations: {
          unique_users_by_euid: {
            buckets: [
              {
                key: 'user:user1',
                doc_count: 1,
                sample: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          user: { name: 'user1' },
                          host: { id: 'h1' },
                        },
                      },
                    ],
                  },
                },
              },
              {
                key: 'user:empty',
                doc_count: 1,
                sample: { hits: { hits: [] } },
              },
            ],
          },
          unique_hosts_by_euid: {
            buckets: [
              {
                key: 'host:host1',
                doc_count: 1,
                sample: { hits: { hits: [{ _source: { host: { name: 'host1' } } }] } },
              },
            ],
          },
        },
      },
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });

    const { result } = renderHook(() => useAttackEntitiesLists(hit));

    expect(result.current.userEntityIdentifiers).toEqual([
      { 'user.name': 'user1', 'host.id': 'h1', 'entity.namespace': 'local' },
    ]);
    expect(result.current.hostEntityIdentifiers).toEqual([{ 'host.name': 'host1' }]);
  });
});
