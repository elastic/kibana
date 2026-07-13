/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackTimestamps } from './use_attack_timestamps';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import {
  fetchQueryAttacks,
  fetchQueryUnifiedAlerts,
} from '../../../../containers/detection_engine/alerts/api';
import { useAttacksPageFetchMethod } from '../../../../hooks/attacks/use_attacks_page_fetch_method';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useInspectButton } from '../../../alerts_kpis/common/hooks';

jest.mock('../../../../containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));
jest.mock('../../../../hooks/attacks/use_attacks_page_fetch_method');
jest.mock('../../../../../common/containers/use_global_time');
jest.mock('../../../alerts_kpis/common/hooks');

const mockUseAttacksPageFetchMethod = useAttacksPageFetchMethod as jest.Mock;

describe('useAttackTimestamps', () => {
  const mockSetQuery = jest.fn();
  const mockDeleteQuery = jest.fn();
  const mockSetGlobalQuery = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttacksPageFetchMethod.mockReturnValue(fetchQueryUnifiedAlerts);
    (useGlobalTime as jest.Mock).mockReturnValue({
      deleteQuery: mockDeleteQuery,
      setQuery: mockSetGlobalQuery,
    });
  });

  it('skips query when no attack IDs provided', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      request: 'request',
      response: 'response',
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAttackTimestamps({ attackIds: [] }));

    expect(result.current.attackStartTimes).toEqual({});
    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('fetches timestamps for provided attack IDs', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: {
        hits: {
          hits: [
            { _id: 'attack-1', _source: { 'kibana.alert.start': '2023-01-01T10:00:00.000Z' } },
            { _id: 'attack-2', _source: { '@timestamp': '2023-01-01T11:00:00.000Z' } },
          ],
        },
      },
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() =>
      useAttackTimestamps({ attackIds: ['attack-1', 'attack-2'] })
    );

    expect(result.current.attackStartTimes).toEqual({
      'attack-1': new Date('2023-01-01T10:00:00.000Z').getTime(),
      'attack-2': new Date('2023-01-01T11:00:00.000Z').getTime(),
    });
    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchMethod: fetchQueryUnifiedAlerts,
        skip: false,
        query: expect.objectContaining({
          query: { ids: { values: ['attack-1', 'attack-2'] } },
        }),
      })
    );
  });

  it('updates query when attack IDs change', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      request: 'request',
      response: 'response',
      setQuery: mockSetQuery,
    });

    renderHook(() => useAttackTimestamps({ attackIds: ['attack-1'] }));

    expect(mockSetQuery).toHaveBeenCalled();
  });

  it('uses fetchQueryAttacks when publicAttacksApiEnabled is on', () => {
    mockUseAttacksPageFetchMethod.mockReturnValue(fetchQueryAttacks);
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      request: 'request',
      response: 'response',
      setQuery: mockSetQuery,
    });

    renderHook(() => useAttackTimestamps({ attackIds: ['attack-1'] }));

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchMethod: fetchQueryAttacks,
      })
    );
  });

  it('registers the query for global refetch after mutations', () => {
    renderHook(() => useAttackTimestamps({ attackIds: ['attack-1'] }));

    expect(useInspectButton).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteQuery: mockDeleteQuery,
        setQuery: mockSetGlobalQuery,
        uniqueQueryId: 'attacks-kpi-attack-timestamps',
      })
    );
  });
});
