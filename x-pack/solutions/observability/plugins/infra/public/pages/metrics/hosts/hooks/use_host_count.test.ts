/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import type * as useKibanaContextForPluginHook from '../../../../hooks/use_kibana';
import * as useTimeRangeMetadataContextModule from '../../../../hooks/use_time_range_metadata';
import * as useUnifiedSearchHooks from './use_unified_search';
import { useHostCount } from './use_host_count';

jest.mock('../../../../hooks/use_fetcher');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../containers/plugin_config_context');
jest.mock('./use_unified_search');

describe('useHostCount', () => {
  jest.spyOn(useTimeRangeMetadataContextModule, 'useTimeRangeMetadataContext').mockReturnValue({
    data: { preferredSchema: 'ecs', schemas: ['ecs', 'semconv'] },
    status: FETCH_STATUS.SUCCESS,
  });
  const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
    typeof useKibanaContextForPlugin
  >;

  const telemetryMock = { reportHostsViewTotalHostCountRetrieved: jest.fn() };

  useKibanaContextForPluginMock.mockReturnValue({
    services: { telemetry: telemetryMock },
  } as unknown as ReturnType<typeof useKibanaContextForPluginHook.useKibanaContextForPlugin>);

  const useUnifiedSearchContextMock =
    useUnifiedSearchHooks.useUnifiedSearchContext as jest.MockedFunction<
      typeof useUnifiedSearchHooks.useUnifiedSearchContext
    >;

  const mockUseUnifiedContext = (searchCriteria: any) => {
    useUnifiedSearchContextMock.mockReturnValue({
      buildQuery: jest.fn(() => 'query'),
      parsedDateRange: { from: '', to: '' },
      searchCriteria,
    } as unknown as ReturnType<typeof useUnifiedSearchHooks.useUnifiedSearchContext>);
  };

  describe('when data is fetched', () => {
    const fetcherDataMock = { count: 10 };

    beforeAll(() => {
      (useFetcher as jest.Mock).mockReturnValue({
        data: fetcherDataMock,
        status: 'success',
        error: null,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('and there is no filters or query applied', () => {
      it('should call reportHostsViewTotalHostCountRetrieved with the correct data', async () => {
        mockUseUnifiedContext({
          query: { query: null },
          filters: [],
          panelFilters: [],
          preferredSchema: 'ecs',
        });

        await renderHook(() => useHostCount());

        expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).toHaveBeenCalledWith({
          total: fetcherDataMock.count,
          with_query: false,
          with_filters: false,
          schema_selected: 'ecs',
          schemas_available: ['ecs', 'semconv'],
          schema_error: false,
        });
      });
    });

    describe('and query is applied', () => {
      it('should call reportHostsViewTotalHostCountRetrieved with the correct data', async () => {
        mockUseUnifiedContext({
          query: { query: 'test' },
          filters: [],
          panelFilters: [],
          preferredSchema: 'ecs',
        });

        await renderHook(() => useHostCount());

        expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).toHaveBeenCalledWith({
          total: fetcherDataMock.count,
          with_query: true,
          with_filters: false,
          schema_selected: 'ecs',
          schemas_available: ['ecs', 'semconv'],
          schema_error: false,
        });
      });
    });

    describe('and filters are applied', () => {
      it('should call reportHostsViewTotalHostCountRetrieved with the correct data', async () => {
        mockUseUnifiedContext({
          query: { query: null },
          filters: [{ filter: 'filter' }],
          panelFilters: [],
          preferredSchema: 'otel',
        });

        await renderHook(() => useHostCount());

        expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).toHaveBeenCalledWith({
          total: fetcherDataMock.count,
          with_query: false,
          with_filters: true,
          schema_selected: 'otel',
          schemas_available: ['ecs', 'semconv'],
          schema_error: false,
        });
      });
    });

    describe('and panel filters are applied', () => {
      it('should call reportHostsViewTotalHostCountRetrieved with the correct data', async () => {
        mockUseUnifiedContext({
          query: { query: null },
          filters: [{ filter: 'filter' }],
          panelFilters: [{ filter: 'filter' }],
          preferredSchema: 'otel',
        });

        await renderHook(() => useHostCount());

        expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).toHaveBeenCalledWith({
          total: fetcherDataMock.count,
          with_query: false,
          with_filters: true,
          schema_selected: 'otel',
          schemas_available: ['ecs', 'semconv'],
          schema_error: false,
        });
      });
    });

    describe('when no data is available', () => {
      it('should call reportHostsViewTotalHostCountRetrieved with the correct data', async () => {
        mockUseUnifiedContext({
          query: { query: null },
          filters: [],
          panelFilters: [],
          preferredSchema: 'no schema available',
        });

        (useFetcher as jest.Mock).mockReturnValue({
          data: { count: 0 },
          status: 'success',
          error: null,
        });

        jest
          .spyOn(useTimeRangeMetadataContextModule, 'useTimeRangeMetadataContext')
          .mockReturnValue({
            data: { preferredSchema: 'ecs', schemas: [] },
            status: FETCH_STATUS.SUCCESS,
          });

        await renderHook(() => useHostCount());

        expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).toHaveBeenCalledWith({
          total: 0,
          with_query: false,
          with_filters: false,
          schema_selected: 'no schema available',
          schemas_available: ['no schema available'],
          schema_error: false,
        });
      });
    });
  });

  describe('when data is fetched with error', () => {
    beforeAll(() => {
      (useFetcher as jest.Mock).mockReturnValue({
        data: {},
        status: 'error',
        error: 'error',
      });
    });

    it('should NOT call reportHostsViewTotalHostCountRetrieved ', async () => {
      mockUseUnifiedContext(null);

      await renderHook(() => useHostCount());

      expect(telemetryMock.reportHostsViewTotalHostCountRetrieved).not.toHaveBeenCalled();
    });
  });
});
