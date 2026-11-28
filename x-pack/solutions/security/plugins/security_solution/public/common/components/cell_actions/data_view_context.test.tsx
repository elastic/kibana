/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { PageScope } from '../../../data_view_manager/constants';
import { CellActionsDataViewProvider, useCellActionsDataView } from './data_view_context';

const alertsDataView = { id: 'alerts-data-view' } as unknown as DataView;
const otherDataView = { id: 'other-data-view' } as unknown as DataView;

const renderUseCellActionsDataView = ({
  requestedScope,
  providerScope,
  dataView,
}: {
  requestedScope: PageScope;
  providerScope?: PageScope;
  dataView?: DataView;
}) =>
  renderHook(() => useCellActionsDataView(requestedScope), {
    wrapper: providerScope
      ? ({ children }: { children?: React.ReactNode }) => (
          <CellActionsDataViewProvider scope={providerScope} dataView={dataView}>
            {children}
          </CellActionsDataViewProvider>
        )
      : undefined,
  });

describe('CellActionsDataViewProvider / useCellActionsDataView', () => {
  it('returns undefined when there is no provider', () => {
    const { result } = renderUseCellActionsDataView({ requestedScope: PageScope.alerts });

    expect(result.current).toBeUndefined();
  });

  it('returns the provided data view when the requested scope matches the provider scope', () => {
    const { result } = renderUseCellActionsDataView({
      requestedScope: PageScope.alerts,
      providerScope: PageScope.alerts,
      dataView: alertsDataView,
    });

    expect(result.current).toBe(alertsDataView);
  });

  it('returns undefined when the requested scope is different from the provider scope', () => {
    const { result } = renderUseCellActionsDataView({
      requestedScope: PageScope.default,
      providerScope: PageScope.alerts,
      dataView: alertsDataView,
    });

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the provider has no data view', () => {
    const { result } = renderUseCellActionsDataView({
      requestedScope: PageScope.alerts,
      providerScope: PageScope.alerts,
      dataView: undefined,
    });

    expect(result.current).toBeUndefined();
  });

  it('returns the new data view when the provided data view changes', () => {
    let dataView: DataView | undefined = alertsDataView;
    const { result, rerender } = renderHook(() => useCellActionsDataView(PageScope.alerts), {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <CellActionsDataViewProvider scope={PageScope.alerts} dataView={dataView}>
          {children}
        </CellActionsDataViewProvider>
      ),
    });
    expect(result.current).toBe(alertsDataView);

    dataView = otherDataView;
    rerender();

    expect(result.current).toBe(otherDataView);
  });

  it('returns undefined once the provided data view is removed', () => {
    let dataView: DataView | undefined = alertsDataView;
    const { result, rerender } = renderHook(() => useCellActionsDataView(PageScope.alerts), {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <CellActionsDataViewProvider scope={PageScope.alerts} dataView={dataView}>
          {children}
        </CellActionsDataViewProvider>
      ),
    });
    expect(result.current).toBe(alertsDataView);

    dataView = undefined;
    rerender();

    expect(result.current).toBeUndefined();
  });

  it('uses the closest provider when providers are nested', () => {
    const { result } = renderHook(() => useCellActionsDataView(PageScope.alerts), {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <CellActionsDataViewProvider scope={PageScope.alerts} dataView={alertsDataView}>
          <CellActionsDataViewProvider scope={PageScope.alerts} dataView={otherDataView}>
            {children}
          </CellActionsDataViewProvider>
        </CellActionsDataViewProvider>
      ),
    });

    expect(result.current).toBe(otherDataView);
  });

  it('hides the outer data view when a nested provider is for another scope', () => {
    const { result } = renderHook(() => useCellActionsDataView(PageScope.alerts), {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <CellActionsDataViewProvider scope={PageScope.alerts} dataView={alertsDataView}>
          <CellActionsDataViewProvider scope={PageScope.timeline} dataView={otherDataView}>
            {children}
          </CellActionsDataViewProvider>
        </CellActionsDataViewProvider>
      ),
    });

    expect(result.current).toBeUndefined();
  });
});
