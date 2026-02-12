/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackIds } from './use_attack_ids';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(),
}));

jest.mock('../../../../containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: jest.fn(() => ({ bool: { filter: [] } })),
}));

jest.mock('@kbn/data-plugin/common', () => ({
  getEsQueryConfig: jest.fn(),
}));

describe('useAttackIds', () => {
  const mockSetQuery = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { uiSettings: {} },
    });
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-02T00:00:00.000Z',
    });
    (getEsQueryConfig as jest.Mock).mockReturnValue({});
  });

  it('fetches attack IDs and returns them', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: {
        aggregations: {
          attacks_volume: {
            buckets: [{ key: 'attack-1' }, { key: 'attack-2' }],
          },
        },
      },
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAttackIds({}));

    expect(result.current.attackIds).toEqual(['attack-1', 'attack-2']);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles loading state', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: true,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAttackIds({}));

    expect(result.current.attackIds).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('handles empty data', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: { aggregations: null },
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAttackIds({}));

    expect(result.current.attackIds).toEqual([]);
  });

  it('updates query when filter/query/time changes', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    renderHook(() => useAttackIds({}));

    expect(mockSetQuery).toHaveBeenCalled();
  });
});
