/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { EDIT_DASHBOARD_TITLE } from '../pages/details/translations';

/** Syncs the dashboard title for Security breadcrumbs (SpyRoute). */
export const useDashboardTitle = (
  dashboardContainer: DashboardApi | undefined
): string | undefined => {
  const [title, setTitle] = useState<string | undefined>();

  useEffect(() => {
    if (!dashboardContainer) {
      setTitle(undefined);
      return;
    }

    const subscription = dashboardContainer.title$.subscribe((dashboardTitle) => {
      setTitle(
        dashboardTitle && dashboardTitle.length !== 0 ? dashboardTitle : EDIT_DASHBOARD_TITLE
      );
    });

    return () => subscription.unsubscribe();
  }, [dashboardContainer]);

  return title;
};
