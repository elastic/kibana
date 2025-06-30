/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { KUBERNETES_DASHBOARD_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { AddKubernetesDataLink } from '../add_kubernetes_data/add_kubernetes_data';
import { useFetchDashboardById } from '../../hooks/use_fetch_dashboard_by_id';

export const RenderDashboard = ({ dashboardId }: { dashboardId: string }) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { dateRange } = useDatePickerContext();
  const { from, to } = dateRange;
  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const getInitialInput = (): Partial<DashboardState> => ({
      viewMode: 'view' as ViewMode,
      timeRange: { from, to },
    });
    return Promise.resolve<DashboardCreationOptions>({
      getInitialInput,
    });
  }, [from, to]);

  const getLocatorParams = useCallback(
    (params: SerializableRecord) => {
      return {
        dashboardId: params?.dashboardId ?? dashboardId,
      };
    },
    [dashboardId]
  );

  const locator = useMemo(() => {
    const baseLocator = share.url.locators.get(KUBERNETES_DASHBOARD_LOCATOR_ID);
    if (!baseLocator) return;

    return {
      ...baseLocator,
      getRedirectUrl: (params: SerializableRecord) =>
        baseLocator.getRedirectUrl(getLocatorParams(params)),
      navigate: (params: SerializableRecord) => baseLocator.navigate(getLocatorParams(params)),
    };
  }, [share, getLocatorParams]);

  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from, to });
    dashboard.setQuery({ query: '', language: 'kuery' });
  }, [dashboard, dashboardId, from, to]);

  const { data: dashboardData, status } = useFetchDashboardById(dashboardId);

  if (!dashboardData && status === FETCH_STATUS.LOADING) {
    return <EuiLoadingSpinner size="xl" />;
  }
  if (!dashboardData && status !== FETCH_STATUS.LOADING && dashboardId.startsWith('kubernetes')) {
    return <AddKubernetesDataLink />;
  }

  return (
    <DashboardRenderer
      locator={locator}
      savedObjectId={dashboardId}
      getCreationOptions={getCreationOptions}
      onApiAvailable={setDashboard}
    />
  );
};
