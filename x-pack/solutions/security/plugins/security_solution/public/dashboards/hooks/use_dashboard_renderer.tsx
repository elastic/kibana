/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardInternalApi } from '@kbn/dashboard-plugin/public/dashboard_api/types';

export const useDashboardRenderer = (savedObjectId?: string) => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardApi>();
  const [dashboardInternalApi, setDashboardInternalApi] = useState<DashboardInternalApi>();

  // Reset while a different saved object loads, forcing consumers (e.g. `DashboardTitle`) to
  // unmount/remount for the new `DashboardApi`. Without this, `useStateFromPublishingSubject`
  // stays subscribed to the old `title$`, so the title/breadcrumb freezes on the previous
  // dashboard's value even after the URL and panels move on to the new one.
  useEffect(() => {
    setDashboardContainer(undefined);
    setDashboardInternalApi(undefined);
  }, [savedObjectId]);

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
