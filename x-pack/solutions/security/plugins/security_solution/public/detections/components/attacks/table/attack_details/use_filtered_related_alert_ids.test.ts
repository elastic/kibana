/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useFilteredRelatedAlertIds } from './use_filtered_related_alert_ids';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../../data_view_manager/hooks/use_browser_fields';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';

vi.mock('../../../../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/hooks/use_selector', () => {
      const mocked = {
      useDeepEqualSelector: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../data_view_manager/hooks/use_data_view', () => {
      const mocked = {
      useDataView: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../data_view_manager/hooks/use_browser_fields', () => {
      const mocked = {
      useBrowserFields: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../containers/detection_engine/alerts/use_query', () => {
      const mocked = {
      useQueryAlerts: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/lib/kuery', () => {
      const mocked = {
      combineQueries: vi.fn(() => ({
        filterQuery: '{"match_all":{}}',
      })),
    };
      return { ...mocked, default: mocked };
    });

describe('useFilteredRelatedAlertIds', () => {
  const setQueryMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useGlobalTime as Mock).mockReturnValue({
      from: 'now-15m',
      to: 'now',
    });

    (useKibana as Mock).mockReturnValue({
      services: {
        uiSettings: {
          get: vi.fn(),
        },
      },
    });

    (useDeepEqualSelector as Mock).mockImplementation((selector) => {
      // Mock globalQuery
      if (selector.name === 'globalQuerySelector') {
        return { query: '', language: 'kuery' };
      }
      // Mock globalFilters
      return [];
    });

    (useDataView as Mock).mockReturnValue({
      dataView: {},
    });

    (useBrowserFields as Mock).mockReturnValue({});

    (useQueryAlerts as Mock).mockReturnValue({
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
    (useQueryAlerts as Mock).mockReturnValue({
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
