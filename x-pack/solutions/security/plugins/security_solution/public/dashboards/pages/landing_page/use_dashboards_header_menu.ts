/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useNavigateTo } from '../../../common/lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../common/lib/telemetry';
import { useCreateSecurityDashboardLink } from '../../hooks/use_create_security_dashboard_link';
import { DASHBOARDS_PAGE_CREATE_BUTTON } from './translations';

export const CREATE_DASHBOARD_MENU_ITEM_TEST_ID = 'createDashboardButton';

/**
 * Builds the Dashboards landing page menu: "Create Dashboard" as the primary action when the user can create dashboards.
 */
export const useDashboardsHeaderMenu = ({
  canCreateDashboard,
}: {
  canCreateDashboard: boolean;
}): AppHeaderMenu => {
  const { isLoading, url } = useCreateSecurityDashboardLink();
  const { navigateTo } = useNavigateTo();

  return useMemo<AppHeaderMenu>(() => {
    if (!canCreateDashboard) {
      return {};
    }

    return {
      primaryActionItem: {
        id: 'createDashboard',
        label: DASHBOARDS_PAGE_CREATE_BUTTON,
        iconType: 'plusCircle',
        href: url,
        run: () => {
          track(METRIC_TYPE.CLICK, TELEMETRY_EVENT.CREATE_DASHBOARD);
          navigateTo({ url });
        },
        disableButton: isLoading,
        testId: CREATE_DASHBOARD_MENU_ITEM_TEST_ID,
      },
    };
  }, [canCreateDashboard, isLoading, navigateTo, url]);
};
