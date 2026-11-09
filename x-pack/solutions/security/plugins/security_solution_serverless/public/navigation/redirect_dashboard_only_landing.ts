/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import { APP_PATH, isSecuritySolutionAccessible } from '@kbn/security-solution-plugin/common';
import type { Services } from '../common/services';

const DASHBOARDS_APP_ID = 'dashboards';
const DISCOVER_APP_ID = 'discover';
const SECURITY_GET_STARTED_PATH = `${APP_PATH}/get_started`;

const landingPaths = new Set(['/', APP_PATH, SECURITY_GET_STARTED_PATH]);

const normalizePath = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

const pathnameFromLocation = (location: string): string => location.split('#')[0] ?? location;

/**
 * Prefer Dashboards, then Discover, for users who cannot open Get started.
 * `capabilities.navLinks.securitySolutionUI` is not a reliable Get started
 * signal: Core defaults every registered app to `true`.
 */
export const getRestrictedLandingAppId = ({
  canAccessGetStarted,
  canAccessDashboards,
  canAccessDiscover,
}: {
  canAccessGetStarted: boolean;
  canAccessDashboards: boolean;
  canAccessDiscover: boolean;
}): string | undefined => {
  if (canAccessGetStarted) {
    return undefined;
  }
  if (canAccessDashboards) {
    return DASHBOARDS_APP_ID;
  }
  if (canAccessDiscover) {
    return DISCOVER_APP_ID;
  }
  return undefined;
};

export const canAccessDashboardsApp = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.dashboard_v2?.show);

export const canAccessDiscoverApp = (capabilities: Capabilities): boolean =>
  Boolean(capabilities.discover_v2?.show);

export const shouldRedirectDashboardOnlyLanding = ({
  pathname,
  canAccessGetStarted,
  canAccessDashboards,
  canAccessDiscover,
}: {
  pathname: string;
  canAccessGetStarted: boolean;
  canAccessDashboards: boolean;
  canAccessDiscover: boolean;
}): boolean =>
  getRestrictedLandingAppId({
    canAccessGetStarted,
    canAccessDashboards,
    canAccessDiscover,
  }) !== undefined && landingPaths.has(normalizePath(pathname));

export const redirectDashboardOnlyLanding = (services: Services, location: string): void => {
  const { application } = services;
  const { capabilities } = application;
  const destination = getRestrictedLandingAppId({
    canAccessGetStarted: isSecuritySolutionAccessible(capabilities),
    canAccessDashboards: canAccessDashboardsApp(capabilities),
    canAccessDiscover: canAccessDiscoverApp(capabilities),
  });

  if (
    destination !== undefined &&
    landingPaths.has(normalizePath(pathnameFromLocation(location)))
  ) {
    application.navigateToApp(destination, { replace: true });
  }
};

export const subscribeDashboardOnlyLanding = (services: Services): Subscription => {
  // currentAppId$ never emits for an inaccessible Security app (App Not Found).
  // currentLocation$ emits the basePath-stripped path#hash on start and every later change.
  return services.application.currentLocation$.subscribe((location) => {
    redirectDashboardOnlyLanding(services, location);
  });
};
