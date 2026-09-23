/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';
import { useLocation } from 'react-router-dom';
import type { PathsOf } from '@kbn/typed-react-router-config';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';
import { useProfilingSetupStatus } from '../profiling_setup_status/use_profiling_setup_status';
import type { ProfilingRoutes } from '../../../routing';

// Routes that render a back button in AppHeader.
// NOTE: This is compared against raw location.pathname, NOT via useProfilingRoutePath(), because
// this provider renders above RedirectWithDefaultDateRange. Calling matchRoutes() at this level
// throws a plain Error when rangeFrom/rangeTo are absent from the URL (they have no defaults in
// the route codec).
export const ROUTES_WITH_BACK_NAVIGATION = [
  '/settings',
  '/storage-explorer',
  '/add-data-instructions',
] as const satisfies ReadonlyArray<PathsOf<ProfilingRoutes>>;

export const hasBackNavigation = (pathname: string): boolean =>
  (ROUTES_WITH_BACK_NAVIGATION as readonly string[]).includes(pathname);

/**
 * Returns the AppHeader `back` prop for the current route, or `undefined` when the current route
 * has no back button.
 */
export const useBackNavigation = (): AppHeaderBack | undefined => {
  const { pathname } = useLocation();
  const {
    start: { core },
  } = useProfilingDependencies();
  const status = useProfilingSetupStatus();

  if (!hasBackNavigation(pathname)) {
    return undefined;
  }

  // No back button on the add data page unless we positively know there is data. While the setup
  // status is unresolved the button would otherwise render and then vanish once has_data: false lands.
  if (pathname === '/add-data-instructions' && status.profilingSetupStatus?.has_data !== true) {
    return undefined;
  }

  return {
    href: core.http.basePath.prepend('/app/profiling'),
    label: i18n.translate('xpack.profiling.header.backTargetLabel', {
      defaultMessage: 'Universal Profiling',
    }),
  };
};
