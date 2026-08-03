/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_time_range_metadata';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { SearchBar } from './search_bar';

jest.mock('@kbn/ebt-tools');
jest.mock('../../../../../containers/metrics_source');
jest.mock('../../../../../hooks/use_time_range_metadata');
jest.mock('../../hooks/use_unified_search');
jest.mock('../../../../../components/shared/unified_search_bar', () => ({
  UnifiedSearchBar: () => null,
}));
jest.mock('./controls_content', () => ({
  ControlsContent: () => null,
}));
jest.mock('./limit_options', () => ({
  LimitOptions: () => null,
}));

const usePerformanceContextMock = jest.mocked(usePerformanceContext);
const useMetricsDataViewContextMock = jest.mocked(useMetricsDataViewContext);
const useTimeRangeMetadataContextMock = jest.mocked(useTimeRangeMetadataContext);
const useUnifiedSearchContextMock = jest.mocked(useUnifiedSearchContext);

describe('SearchBar', () => {
  it('selects the preferred schema when the current schema is unavailable', async () => {
    const onPreferredSchemaChange = jest.fn();
    usePerformanceContextMock.mockReturnValue({
      onPageRefreshStart: jest.fn(),
    } as unknown as ReturnType<typeof usePerformanceContext>);
    useMetricsDataViewContextMock.mockReturnValue({
      metricsView: {
        dataViewReference: {},
      },
    } as unknown as ReturnType<typeof useMetricsDataViewContext>);
    useTimeRangeMetadataContextMock.mockReturnValue({
      data: {
        preferredSchema: 'semconv',
        schemas: ['semconv'],
      },
      status: 'success',
    } as unknown as ReturnType<typeof useTimeRangeMetadataContext>);
    useUnifiedSearchContextMock.mockReturnValue({
      searchCriteria: {
        dateRange: {
          from: 'now-15m',
          to: 'now',
        },
        filters: [],
        limit: 10,
        preferredSchema: 'ecs',
        query: {
          language: 'kuery',
          query: '',
        },
      },
      onLimitChange: jest.fn(),
      onPanelFiltersChange: jest.fn(),
      onPreferredSchemaChange,
      onSubmit: jest.fn(),
    } as unknown as ReturnType<typeof useUnifiedSearchContext>);

    render(<SearchBar />);

    await waitFor(() => expect(onPreferredSchemaChange).toHaveBeenCalledWith('semconv'));
  });
});
