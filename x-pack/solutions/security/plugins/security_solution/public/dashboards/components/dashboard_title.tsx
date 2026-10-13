/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { EDIT_DASHBOARD_TITLE } from '../pages/details/translations';

/** Syncs dashboard title into Security breadcrumbs (SpyRoute); chrome shows the visible title. */
const DashboardTitleComponent = ({
  dashboardContainer,
  onTitleLoaded,
}: {
  dashboardContainer: DashboardApi;
  onTitleLoaded: (title: string) => void;
}) => {
  const dashboardTitle = useStateFromPublishingSubject(dashboardContainer.title$);
  const title = useMemo(() => {
    return dashboardTitle && dashboardTitle.length !== 0 ? dashboardTitle : EDIT_DASHBOARD_TITLE;
  }, [dashboardTitle]);

  useEffect(() => {
    onTitleLoaded(title);
  }, [dashboardContainer, title, onTitleLoaded]);

  return null;
};

export const DashboardTitle = React.memo(DashboardTitleComponent);
