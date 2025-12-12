/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from './use_kibana';

const DASHBOARD_LOCATOR_ID = 'DASHBOARD_APP_LOCATOR';

export const useNavigateToDashboard = (dashboardId?: string) => {
  const { share } = useKibana().services;

  return useCallback(async () => {
    const dashboardLocator = share.url.locators.get(DASHBOARD_LOCATOR_ID);
    if (dashboardLocator && dashboardId) {
      await dashboardLocator.navigate({ dashboardId });
    }
  }, [share, dashboardId]);
};
