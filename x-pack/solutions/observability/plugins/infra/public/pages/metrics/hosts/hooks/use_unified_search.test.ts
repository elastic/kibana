/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { Query } from '@kbn/es-query';
import { Subject } from 'rxjs';
import { useKibanaQuerySettings } from '@kbn/observability-shared-plugin/public';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { useInfraMLCapabilitiesContext } from '../../../../containers/ml/infra_ml_capabilities';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useReloadRequestTimeContext } from '../../../../hooks/use_reload_request_time';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useUnifiedSearch } from './use_unified_search';
import { useHostsUrlState } from './use_unified_search_url_state';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useKibanaQuerySettings: jest.fn(),
}));
jest.mock('../../../../alerting/use_alert_prefill');
jest.mock('../../../../containers/ml/infra_ml_capabilities');
jest.mock('../../../../containers/metrics_source');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_reload_request_time');
jest.mock('../../../../hooks/use_time_range');
jest.mock('./use_unified_search_url_state');

const mockUseKibanaQuerySettings = useKibanaQuerySettings as jest.MockedFunction<
  typeof useKibanaQuerySettings
>;
const mockUseAlertPrefillContext = useAlertPrefillContext as jest.MockedFunction<
  typeof useAlertPrefillContext
>;
const mockUseInfraMLCapabilitiesContext = useInfraMLCapabilitiesContext as jest.MockedFunction<
  typeof useInfraMLCapabilitiesContext
>;
const mockUseMetricsDataViewContext = useMetricsDataViewContext as jest.MockedFunction<
  typeof useMetricsDataViewContext
>;
const mockUseKibanaContextForPlugin = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const mockUseReloadRequestTimeContext = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;
const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseHostsUrlState = useHostsUrlState as jest.MockedFunction<typeof useHostsUrlState>;

const initialQuery: Query = { language: 'kuery', query: '' };
const searchCriteria = {
  dateRange: { from: 'now-15m', to: 'now' },
  filters: [],
  limit: 100,
  panelFilters: [],
  preferredSchema: 'ecs' as const,
  query: initialQuery,
};
const setSearch = jest.fn();
const updateReloadRequestTime = jest.fn();
const refetchMetricsView = jest.fn();
const updateTopbarMenuVisibilityBySchema = jest.fn();
const resetPrefill = jest.fn();
const setPrefillState = jest.fn();
const reportHostsViewQuerySubmitted = jest.fn();

describe('useUnifiedSearch', () => {
  let queryUpdates$: Subject<void>;
  let filterUpdates$: Subject<void>;
  let timeUpdates$: Subject<void>;
  let currentQuery: Query;

  beforeEach(() => {
    jest.clearAllMocks();
    queryUpdates$ = new Subject();
    filterUpdates$ = new Subject();
    timeUpdates$ = new Subject();
    currentQuery = initialQuery;

    mockUseHostsUrlState.mockReturnValue([searchCriteria, setSearch]);
    mockUseMetricsDataViewContext.mockReturnValue({
      metricsView: { dataViewReference: {} },
      refetch: refetchMetricsView,
    } as unknown as ReturnType<typeof useMetricsDataViewContext>);
    mockUseReloadRequestTimeContext.mockReturnValue({
      updateReloadRequestTime,
    } as unknown as ReturnType<typeof useReloadRequestTimeContext>);
    mockUseInfraMLCapabilitiesContext.mockReturnValue({
      updateTopbarMenuVisibilityBySchema,
    } as unknown as ReturnType<typeof useInfraMLCapabilitiesContext>);
    mockUseAlertPrefillContext.mockReturnValue({
      inventoryPrefill: {
        reset: resetPrefill,
        setPrefillState,
      },
    } as unknown as ReturnType<typeof useAlertPrefillContext>);
    mockUseKibanaQuerySettings.mockReturnValue({});
    mockUseTimeRange.mockReturnValue({
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-01T00:15:00.000Z',
    });
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: {
              getFilters: jest.fn(() => []),
              getUpdates$: jest.fn(() => filterUpdates$),
              setFilters: jest.fn(),
            },
            queryString: {
              getQuery: jest.fn(() => currentQuery),
              getUpdates$: jest.fn(() => queryUpdates$),
              setQuery: jest.fn(),
            },
            timefilter: {
              timefilter: {
                getTime: jest.fn(() => searchCriteria.dateRange),
                getTimeUpdate$: jest.fn(() => timeUpdates$),
              },
            },
          },
        },
        telemetry: { reportHostsViewQuerySubmitted },
      },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  });

  it('updates URL state and refreshes data for a valid query service update', () => {
    const validQuery: Query = { language: 'kuery', query: 'host.name: "host-0"' };
    currentQuery = validQuery;
    renderHook(() => useUnifiedSearch());

    act(() => queryUpdates$.next());

    expect(setSearch).toHaveBeenCalledWith({ type: 'SET_QUERY', query: validQuery });
    expect(updateReloadRequestTime).toHaveBeenCalledTimes(1);
    expect(refetchMetricsView).toHaveBeenCalledTimes(1);
  });

  it('reports a validation error without changing URL state or refreshing data', async () => {
    currentQuery = { language: 'kuery', query: 'host.name: (' };
    const { result } = renderHook(() => useUnifiedSearch());

    act(() => queryUpdates$.next());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(setSearch).not.toHaveBeenCalled();
    expect(updateReloadRequestTime).not.toHaveBeenCalled();
    expect(refetchMetricsView).not.toHaveBeenCalled();
  });
});
