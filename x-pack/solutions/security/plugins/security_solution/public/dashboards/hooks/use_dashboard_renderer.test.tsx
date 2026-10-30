/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DashboardApi, DashboardInternalApi } from '@kbn/dashboard-plugin/public';

import { useDashboardRenderer } from './use_dashboard_renderer';

jest.mock('../../common/lib/kibana');

const mockDashboardContainer = {} as DashboardApi;
const mockDashboardInternalApi = {} as DashboardInternalApi;

describe('useDashboardRenderer', () => {
  it('should set dashboard container correctly when dashboard is loaded', () => {
    const { result } = renderHook(() => useDashboardRenderer());

    act(() => {
      result.current.handleDashboardLoaded(mockDashboardContainer, mockDashboardInternalApi);
    });

    expect(result.current.dashboardContainer).toEqual(mockDashboardContainer);
    expect(result.current.dashboardInternalApi).toEqual(mockDashboardInternalApi);
  });

  it('should clear the dashboard container when savedObjectId changes', () => {
    const { result, rerender } = renderHook(
      ({ savedObjectId }: { savedObjectId?: string }) => useDashboardRenderer(savedObjectId),
      { initialProps: { savedObjectId: 'dashboard-1' } }
    );

    act(() => {
      result.current.handleDashboardLoaded(mockDashboardContainer, mockDashboardInternalApi);
    });
    expect(result.current.dashboardContainer).toEqual(mockDashboardContainer);

    rerender({ savedObjectId: 'dashboard-2' });

    expect(result.current.dashboardContainer).toBeUndefined();
    expect(result.current.dashboardInternalApi).toBeUndefined();
  });
});
