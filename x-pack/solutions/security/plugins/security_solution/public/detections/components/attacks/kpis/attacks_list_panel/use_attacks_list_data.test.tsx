/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import { useAttacksListData } from './use_attacks_list_data';
import { useAttackTitles } from './use_attack_titles';
import { useAlertsAggregation } from '../common/use_alerts_aggregation';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { getAttacksListAggregations } from './aggregations';

jest.mock('./use_attack_titles');
jest.mock('../common/use_alerts_aggregation');
jest.mock('./aggregations');

describe('useAttacksListData', () => {
  const mockFilters = [{ meta: {}, query: {} }] as Filter[];
  const mockQuery = { query: 'test' } as unknown as Query;

  const mockAggregations = {
    attacks: {
      buckets: [
        { key: 'attack-1', doc_count: 10, attackRelatedAlerts: { doc_count: 5 } },
        { key: 'attack-2', doc_count: 8, attackRelatedAlerts: { doc_count: 3 } },
      ],
    },
    total_attacks: {
      value: 20,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAttacksListAggregations as jest.Mock).mockReturnValue({ some: 'agg' });
    (useAlertsAggregation as jest.Mock).mockReturnValue({
      data: { aggregations: mockAggregations },
      loading: false,
      refetch: jest.fn(),
    });
    (useAttackTitles as jest.Mock).mockReturnValue({
      attackTitles: {
        'attack-1': 'Title attack-1',
        'attack-2': 'Title attack-2',
      },
      isLoading: false,
    });
  });

  it('fetches aggregation data with correct parameters', () => {
    renderHook(() => useAttacksListData({ filters: mockFilters, query: mockQuery, pageSize: 10 }));

    expect(getAttacksListAggregations).toHaveBeenCalledWith(0, 10);
    expect(useAlertsAggregation).toHaveBeenCalledWith({
      filters: mockFilters,
      query: mockQuery,
      aggs: { some: 'agg' },
      queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
    });
  });

  it('returns formatted items and pagination data', () => {
    const { result } = renderHook(() =>
      useAttacksListData({ filters: mockFilters, query: mockQuery, pageSize: 10 })
    );

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]).toEqual({
      id: 'attack-1',
      name: 'Title attack-1',
      alertsCount: 5,
    });
    expect(result.current.items[1]).toEqual({
      id: 'attack-2',
      name: 'Title attack-2',
      alertsCount: 3,
    });
    expect(result.current.total).toBe(20);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles page changes', () => {
    const { result } = renderHook(() =>
      useAttacksListData({ filters: mockFilters, query: mockQuery, pageSize: 10 })
    );

    act(() => {
      result.current.setPageIndex(1);
    });

    expect(getAttacksListAggregations).toHaveBeenCalledWith(1, 10);
  });

  it('handles loading state', () => {
    (useAlertsAggregation as jest.Mock).mockReturnValue({
      data: undefined,
      loading: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useAttacksListData({ filters: mockFilters, query: mockQuery })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('handles attack loading state', () => {
    (useAttackTitles as jest.Mock).mockReturnValue({
      attackTitles: {
        'attack-1': 'Title attack-1',
      },
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useAttacksListData({ filters: mockFilters, query: mockQuery })
    );

    // If attackIds are present (from aggData), then isAttacksLoading contributes to isLoading
    expect(result.current.isLoading).toBe(true);
  });
});
