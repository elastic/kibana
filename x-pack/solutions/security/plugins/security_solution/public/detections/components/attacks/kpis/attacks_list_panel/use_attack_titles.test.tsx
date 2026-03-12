/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackTitles } from './use_attack_titles';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';

jest.mock('../../../../containers/detection_engine/alerts/use_query');

describe('useAttackTitles', () => {
  const mockSetQuery = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });
  });

  it('fetches attack titles for provided IDs', () => {
    const attackIds = ['1', '2'];
    renderHook(() => useAttackTitles({ attackIds }));

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_DETAILS,
        query: {
          size: 2,
          _source: ['kibana.alert.attack_discovery.title'],
          query: { ids: { values: ['1', '2'] } },
        },
      })
    );
  });

  it('skips query when no attack IDs provided', () => {
    renderHook(() => useAttackTitles({ attackIds: [] }));

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
        query: {},
      })
    );
  });

  it('extracts titles from response data', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: {
        hits: {
          hits: [
            { _id: '1', _source: { 'kibana.alert.attack_discovery.title': 'Attack 1' } },
            { _id: '2', _source: { 'kibana.alert.attack_discovery.title': 'Attack 2' } },
            { _id: '3', _source: {} }, // Missing title
          ],
        },
      },
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAttackTitles({ attackIds: ['1', '2', '3'] }));

    expect(result.current.attackTitles).toEqual({
      '1': 'Attack 1',
      '2': 'Attack 2',
    });
  });

  it('updates query when attack IDs change', () => {
    const { rerender } = renderHook(({ attackIds }) => useAttackTitles({ attackIds }), {
      initialProps: { attackIds: ['1'] },
    });

    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['1'] } },
      })
    );

    rerender({ attackIds: ['1', '2'] });

    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['1', '2'] } },
      })
    );
  });
});
