/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { WaffleFiltersState } from './use_waffle_filters';
import { useWaffleFilters } from './use_waffle_filters';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';
import type { ResolvedDataView } from '../../../../utils/data_view';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../../../alerting/use_alert_prefill');

const mockUseUrlState = useUrlState as jest.MockedFunction<typeof useUrlState>;
const mockUseAlertPrefillContext = useAlertPrefillContext as jest.MockedFunction<
  typeof useAlertPrefillContext
>;

// Mock useUrlState hook
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: '',
    replace: () => {},
  }),
}));

const mockDataView = {
  id: 'mock-id',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
  getIndexPattern: () => 'mock-title',
} as jest.Mocked<DataView>;

jest.mock('../../../../containers/metrics_source', () => ({
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
}));

jest.mock('./use_inventory_views', () => ({
  useInventoryViewsContext: () => ({
    currentView: undefined,
  }),
}));

const renderUseWaffleFiltersHook = () => renderHook(() => useWaffleFilters());
const setPrefillState = jest.fn();

describe('useWaffleFilters', () => {
  beforeEach(() => {
    mockUseAlertPrefillContext.mockReturnValue({
      inventoryPrefill: {
        setPrefillState,
      },
    } as unknown as ReturnType<typeof useAlertPrefillContext>);

    mockUseUrlState.mockReturnValue([
      { kind: 'kuery', expression: '' } as WaffleFiltersState,
      jest.fn(),
    ]);
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleFiltersHook();

    const newQuery = {
      expression: 'foo: *',
      kind: 'kuery',
    } as WaffleFiltersState;

    act(() => {
      mockUseUrlState.mockReturnValue([newQuery, jest.fn()]);
      result.current.applyFilterQuery(newQuery.expression);
    });

    rerender();

    expect(setPrefillState).toHaveBeenCalledWith({ kuery: newQuery.expression });
  });
});
