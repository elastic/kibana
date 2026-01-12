/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardInternalApi } from '@kbn/dashboard-plugin/public/dashboard_api/types';

export const useDashboardRenderer = () => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardApi>();
  const [dashboardInternalApi, setDashboardInternalApi] = useState<DashboardInternalApi>();

  const handleDashboardLoaded = useCallback(
    (container: DashboardApi, internalApi: DashboardInternalApi) => {
      setDashboardContainer(container);
      setDashboardInternalApi(internalApi);
    },
    []
  );

  return useMemo(
    () => ({
      dashboardContainer,
      dashboardInternalApi,
      handleDashboardLoaded,
    }),
    [dashboardContainer, dashboardInternalApi, handleDashboardLoaded]
  );
};
