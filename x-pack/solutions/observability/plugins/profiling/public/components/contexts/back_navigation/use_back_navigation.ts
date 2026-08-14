/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBack } from '@kbn/app-header';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';
import { BackNavigationContext, hasBackNavigation } from './back_navigation_context';
import { useProfilingSetupStatus } from '../profiling_setup_status/use_profiling_setup_status';

/**
 * Returns the AppHeader `back` prop for the current route, or `undefined` when the current route
 * has no back button.
 *
 * When a back target is returned, it points at the last content route the user visited (preserving
 * path and query string). Falls back to the plugin root (/app/profiling) when nothing has
 * been recorded yet (e.g. cold deep link directly to /settings).
 */
export const useBackNavigation = (): AppHeaderBack | undefined => {
  const context = useContext(BackNavigationContext);
  if (!context) {
    throw new Error('BackNavigationContext not found');
  }

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

  const { lastVisitedRoute } = context;

  if (lastVisitedRoute) {
    return core.http.basePath.prepend('/app/profiling' + lastVisitedRoute);
  }

  // Fallback to plugin route if no last content route has been recorded yet (e.g. cold deep link directly to /settings).
  return core.http.basePath.prepend('/app/profiling');
};
