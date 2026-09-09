/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { APP_PATH } from '@kbn/security-solution-plugin/common';
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import type { Services } from '../common/services';

const DASHBOARDS_APP_ID = 'dashboards';
const SECURITY_GET_STARTED_PATH = `${APP_PATH}/get_started`;

const landingPaths = new Set(['/', SECURITY_GET_STARTED_PATH]);

const normalizePath = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

export const shouldRedirectDashboardOnlyLanding = ({
  pathname,
  canAccessGetStarted,
  canAccessDashboards,
}: {
  pathname: string;
  canAccessGetStarted: boolean;
  canAccessDashboards: boolean;
}): boolean =>
  !canAccessGetStarted && canAccessDashboards && landingPaths.has(normalizePath(pathname));

export const redirectDashboardOnlyLanding = (services: Services): void => {
  const { application, http } = services;
  const { navLinks } = application.capabilities;

  if (
    shouldRedirectDashboardOnlyLanding({
      pathname: http.basePath.remove(window.location.pathname),
      canAccessGetStarted: Boolean(navLinks?.[SECURITY_UI_APP_ID]),
      canAccessDashboards: Boolean(navLinks?.[DASHBOARDS_APP_ID]),
    })
  ) {
    application.navigateToApp(DASHBOARDS_APP_ID, { replace: true });
  }
};

export const subscribeDashboardOnlyLanding = (services: Services): Subscription => {
  const run = () => redirectDashboardOnlyLanding(services);
  run();
  return services.application.currentAppId$.subscribe(run);
};
