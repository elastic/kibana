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
import { INFRA_DASHBOARD_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { AddKubernetesDataLink } from '../add_kubernetes_data/add_kubernetes_data';
import { useFetchDashboardById } from '../../hooks/use_fetch_dashboard_by_id';

export const RenderDashboard = ({
  dashboardId,
  kuery,
}: {
  dashboardId: string;
  kuery?: string;
}) => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const { dateRange } = useDatePickerContext();
  const { from, to } = dateRange;
  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const getInitialInput = (): Partial<DashboardState> => ({
      viewMode: 'view' as ViewMode,
      timeRange: { from, to },
      query: { query: kuery ?? '', language: 'kuery' },
    });
    return Promise.resolve<DashboardCreationOptions>({
      getInitialInput,
    });
  }, [from, kuery, to]);

  const locator = useMemo(() => {
    const baseLocator = share.url.locators.get(INFRA_DASHBOARD_LOCATOR_ID);
    if (!baseLocator) return;

    return {
      ...baseLocator,
    };
  }, [share]);

  const [dashboard, setDashboard] = useState<DashboardApi | undefined>(undefined);

  useEffect(() => {
    if (!dashboard) return;
    dashboard.setTimeRange({ from, to });
    dashboard.setQuery({ query: kuery ?? '', language: 'kuery' });
  }, [dashboard, dashboardId, from, kuery, to]);

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
