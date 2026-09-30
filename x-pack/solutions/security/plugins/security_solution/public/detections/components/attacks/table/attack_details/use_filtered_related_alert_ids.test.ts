/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFilteredRelatedAlertIds } from './use_filtered_related_alert_ids';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../../data_view_manager/hooks/use_browser_fields';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';

jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
}));

jest.mock('../../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(),
}));

jest.mock('../../../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: jest.fn(),
}));

jest.mock('../../../../containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));

jest.mock('../../../../../common/lib/kuery', () => ({
  combineQueries: jest.fn(() => ({
    filterQuery: '{"match_all":{}}',
  })),
}));

describe('useFilteredRelatedAlertIds', () => {
  const setQueryMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useGlobalTime as jest.Mock).mockReturnValue({
      from: 'now-15m',
      to: 'now',
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn(),
        },
      },
    });

    (useDeepEqualSelector as jest.Mock).mockImplementation((selector) => {
      // Mock globalQuery
      if (selector.name === 'globalQuerySelector') {
        return { query: '', language: 'kuery' };
      }
      // Mock globalFilters
      return [];
    });

    (useDataView as jest.Mock).mockReturnValue({
      dataView: {},
    });

    (useBrowserFields as jest.Mock).mockReturnValue({});

    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: {
        hits: {
          hits: [{ _id: 'alert-1' }, { _id: 'alert-2' }],
        },
      },
      loading: false,
      setQuery: setQueryMock,
    });
  });

  it('returns an empty set and does not query when enabled is false', () => {
    const { result } = renderHook(() =>
      useFilteredRelatedAlertIds({
        attackAlertIds: ['alert-1', 'alert-2'],
        filters: [],
        enabled: false,
      })
    );

    expect(result.current.filteredAlertIds.size).toBe(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(true);

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
        query: {},
      })
    );
  });

  it('returns matching alert ids when enabled is true', () => {
    const { result } = renderHook(() =>
      useFilteredRelatedAlertIds({
        attackAlertIds: ['alert-1', 'alert-2'],
        filters: [],
        enabled: true,
      })
    );

    expect(result.current.filteredAlertIds).toEqual(new Set(['alert-1', 'alert-2']));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(true);

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
        query: expect.objectContaining({
          size: 2,
          _source: false,
          fields: [],
          query: {
            bool: {
              filter: [{ match_all: {} }, { ids: { values: ['alert-1', 'alert-2'] } }],
            },
          },
        }),
      })
    );
  });

  it('returns empty object query when attackAlertIds is empty', () => {
    renderHook(() =>
      useFilteredRelatedAlertIds({
        attackAlertIds: [],
        filters: [],
        enabled: true,
      })
    );

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {},
      })
    );
  });

  it('handles loading state from useQueryAlerts', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: true,
      setQuery: setQueryMock,
    });

    const { result } = renderHook(() =>
      useFilteredRelatedAlertIds({
        attackAlertIds: ['alert-1', 'alert-2'],
        filters: [],
        enabled: true,
      })
    );

    expect(result.current.filteredAlertIds.size).toBe(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isReady).toBe(false);
  });
});
