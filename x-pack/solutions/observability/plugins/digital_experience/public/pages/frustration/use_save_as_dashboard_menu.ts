/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardApi, RedirectToProps } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../../ebt_constants';
import { useKibanaServices } from '../../hooks/use_kibana_services';

const SAVE_AS_DASHBOARD_LABEL = i18n.translate(
  'xpack.digitalExperience.frustration.saveAsDashboard',
  { defaultMessage: 'Save as dashboard' }
);

const SAVE_AS_DASHBOARD_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.frustration.saveAsDashboardTooltip',
  { defaultMessage: 'Save these panels as a dashboard you can edit and share' }
);

/**
 * The header action that saves the page's dashboard as a Kibana dashboard and opens it.
 * `undefined` until the dashboard loads, or without the privilege to save dashboards.
 */
export const useSaveAsDashboardMenu = (
  dashboardApi: DashboardApi | undefined
): AppHeaderMenu | undefined => {
  const { application, share } = useKibanaServices();
  const canSaveDashboards = Boolean(application.capabilities.dashboard_v2?.showWriteControls);
  const locator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  return useMemo(() => {
    if (!dashboardApi || !canSaveDashboards) {
      return undefined;
    }
    const openSaved = (redirect: RedirectToProps) => {
      if (redirect.destination === 'dashboard' && redirect.id) {
        locator?.navigate({ dashboardId: redirect.id });
      }
    };
    return {
      items: [
        {
          id: 'saveAsDashboard',
          label: SAVE_AS_DASHBOARD_LABEL,
          iconType: 'save',
          testId: 'digitalExperienceFrustrationSaveAsDashboard',
          tooltipContent: SAVE_AS_DASHBOARD_TOOLTIP,
          ebt: { action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SAVE_AS_DASHBOARD },
          run: () => {
            dashboardApi.runInteractiveSave(openSaved);
          },
        },
      ],
    };
  }, [canSaveDashboards, dashboardApi, locator]);
};
