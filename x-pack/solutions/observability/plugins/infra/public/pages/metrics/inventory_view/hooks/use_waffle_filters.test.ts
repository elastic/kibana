/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked, MockedFunction } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { WaffleFiltersState } from './use_waffle_filters';
import { useWaffleFilters } from './use_waffle_filters';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';
import type { ResolvedDataView } from '../../../../utils/data_view';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';

vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('../../../../hooks/use_kibana');
vi.mock('../../../../alerting/use_alert_prefill');

const mockUseUrlState = useUrlState as MockedFunction<typeof useUrlState>;
const mockUseKibanaContextForPlugin = useKibanaContextForPlugin as MockedFunction<
  typeof useKibanaContextForPlugin
>;
const mockUseAlertPrefillContext = useAlertPrefillContext as MockedFunction<
  typeof useAlertPrefillContext
>;

// Mock useUrlState hook
vi.mock('react-router-dom', () => {
      const mocked = {
      useHistory: () => ({
        location: '',
        replace: () => {},
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockDataView = {
  id: 'mock-id',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
  getIndexPattern: () => 'mock-title',
} as Mocked<DataView>;

vi.mock('../../../../containers/metrics_source', () => {
      const mocked = {
      useMetricsDataViewContext: () => ({
        metricsView: {
          indices: 'jestbeat-*',
          timeFieldName: mockDataView.timeFieldName,
          fields: mockDataView.fields,
          dataViewReference: mockDataView,
        } as ResolvedDataView,
        loading: false,
        error: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_inventory_views', () => {
      const mocked = {
      useInventoryViewsContext: () => ({
        currentView: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });

const renderUseWaffleFiltersHook = () => renderHook(() => useWaffleFilters());
const setPrefillState = vi.fn();

const DEFAULT_STATE: WaffleFiltersState = {
  language: 'kuery',
  query: '',
};

const dataPluginStartMock = dataPluginMock.createStartContract();

describe('useWaffleFilters', () => {
  const mockGetQuery = vi.fn().mockReturnValue(DEFAULT_STATE);
  beforeEach(() => {
    mockUseUrlState.mockReturnValue([DEFAULT_STATE, vi.fn()]);

    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        data: {
          ...dataPluginStartMock,
          query: {
            ...dataPluginStartMock.query,
            queryString: {
              ...dataPluginStartMock.query.queryString,
              getQuery: mockGetQuery,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
    mockUseAlertPrefillContext.mockReturnValue({
      inventoryPrefill: {
        setPrefillState,
      },
    } as unknown as ReturnType<typeof useAlertPrefillContext>);

    mockUseUrlState.mockReturnValue([
      { language: 'kuery', query: '' } as WaffleFiltersState,
      vi.fn(),
    ]);
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleFiltersHook();

    const newQuery = {
      query: 'foo',
      language: 'kuery',
    } as WaffleFiltersState;

    act(() => {
      mockGetQuery.mockReturnValue(newQuery);
      mockUseUrlState.mockReturnValue([newQuery, vi.fn()]);
      result.current.applyFilterQuery({
        query: newQuery,
      });
    });

    rerender();

    expect(setPrefillState).toHaveBeenCalledWith({ kuery: newQuery.query });
  });
});
