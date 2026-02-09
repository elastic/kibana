/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackEntitiesLists } from './use_attack_entities_lists';
import { useAttackDetailsContext } from '../context';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));

jest.mock('@kbn/elastic-assistant-common', () => ({
  getOriginalAlertIds: jest.fn(({ alertIds }: { alertIds: string[] }) => alertIds),
}));

describe('useAttackEntitiesLists', () => {
  const getFieldsDataMock = jest.fn();
  const mockUseQueryAlerts = jest.mocked(useQueryAlerts);

  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      getFieldsData: getFieldsDataMock,
    });
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
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return [];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });

    const { result } = renderHook(() => useAttackEntitiesLists());

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: [],
      replacements: {},
    });
    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
    expect(result.current.userNames).toEqual([]);
    expect(result.current.hostNames).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('passes query with ids filter and terms aggs when alertIds exist', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1', 'id2'];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });

    renderHook(() => useAttackEntitiesLists());

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
        query: expect.objectContaining({
          query: { ids: { values: ['id1', 'id2'] } },
          size: 0,
          aggs: {
            unique_user_names: {
              terms: { field: 'user.name', size: 200 },
            },
            unique_host_names: {
              terms: { field: 'host.name', size: 200 },
            },
          },
        }),
      })
    );
  });

  it('parses userNames and hostNames from aggregation buckets', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1'];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        took: 0,
        timeout: false,
        aggregations: {
          unique_user_names: {
            buckets: [
              { key: 'user1', doc_count: 2 },
              { key: 'user2', doc_count: 1 },
            ],
          },
          unique_host_names: {
            buckets: [
              { key: 'host1', doc_count: 3 },
              { key: 'host2', doc_count: 1 },
            ],
          },
        },
      },
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });

    const { result } = renderHook(() => useAttackEntitiesLists());

    expect(result.current.userNames).toEqual(['user1', 'user2']);
    expect(result.current.hostNames).toEqual(['host1', 'host2']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('returns empty arrays when aggregations are missing', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1'];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });
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

    const { result } = renderHook(() => useAttackEntitiesLists());

    expect(result.current.userNames).toEqual([]);
    expect(result.current.hostNames).toEqual([]);
  });

  it('filters out empty string keys from buckets', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1'];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        took: 0,
        timeout: false,
        aggregations: {
          unique_user_names: {
            buckets: [
              { key: 'user1', doc_count: 1 },
              { key: '', doc_count: 1 },
            ],
          },
          unique_host_names: {
            buckets: [{ key: 'host1', doc_count: 1 }],
          },
        },
      },
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: null,
    });

    const { result } = renderHook(() => useAttackEntitiesLists());

    expect(result.current.userNames).toEqual(['user1']);
    expect(result.current.hostNames).toEqual(['host1']);
  });
});
