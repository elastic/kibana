/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { DashboardApi, RedirectToProps } from '@kbn/dashboard-plugin/public';
import { DashboardTopNav } from '@kbn/dashboard-plugin/public';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common';
import type { ViewMode } from '@kbn/presentation-publishing';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { DashboardInternalApi } from '@kbn/dashboard-plugin/public/dashboard_api/types';
import { SecurityPageName } from '../../../common';
import { useCapabilities, useKibana, useNavigation } from '../../common/lib/kibana';
import { APP_NAME } from '../../../common/constants';

const DashboardToolBarComponent = ({
  dashboardContainer,
  dashboardInternalApi,
  onLoad,
}: {
  dashboardContainer: DashboardApi;
  dashboardInternalApi: DashboardInternalApi;
  onLoad?: (mode: ViewMode) => void;
}) => {
  const { setHeaderActionMenu } = useKibana().services;

  const viewMode = useStateFromPublishingSubject(dashboardContainer.viewMode$);

  const { navigateTo, getAppUrl } = useNavigation();
  const redirectTo = useCallback(
    ({ destination, id }: RedirectToProps & { id?: string }) => {
      if (destination === 'listing') {
        navigateTo({ deepLinkId: SecurityPageName.dashboards });
      }
      if (destination === 'dashboard') {
        navigateTo({
          deepLinkId: SecurityPageName.dashboards,
          path: id ? `${id}/edit` : `/create`,
        });
      }
    },
    [navigateTo]
  );

  const landingBreadcrumb: ChromeBreadcrumb[] = useMemo(
    () => [
      {
        text: APP_NAME,
        href: getAppUrl({ deepLinkId: SecurityPageName.landing }),
      },
    ],
    [getAppUrl]
  );

  useEffect(() => {
    onLoad?.(viewMode ?? 'view');
  }, [onLoad, viewMode]);

  const embedSettings = useMemo(
    () => ({
      forceHideFilterBar: true,
      forceShowTopNavMenu: true,
      forceShowQueryInput: false,
      forceShowDatePicker: false,
    }),
    []
  );
  const { showWriteControls } = useCapabilities<DashboardCapabilities>('dashboard_v2');

  return showWriteControls ? (
    <DashboardTopNav
      customLeadingBreadCrumbs={landingBreadcrumb}
      dashboardApi={dashboardContainer}
      dashboardInternalApi={dashboardInternalApi}
      forceHideUnifiedSearch={true}
      embedSettings={embedSettings}
      redirectTo={redirectTo}
      showBorderBottom={false}
      setCustomHeaderActionMenu={setHeaderActionMenu}
      showResetChange={false}
    />
  ) : null;
};

export const DashboardToolBar = React.memo(DashboardToolBarComponent);
