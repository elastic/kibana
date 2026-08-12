/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf } from '@kbn/typed-react-router-config';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ProfilingRoutes } from '../../../routing';

// Routes that render a back button in AppHeader. Every other route is a content route and is
// eligible to be recorded as the back target.
//
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

export interface BackNavigationApi {
  /**
   * Raw `pathname + search` of the last content route visited (i.e. a route without a back
   * target). Used by useBackNavigation() to build the AppHeader back href.
   */
  lastVisitedRoute: string | undefined;
}

export const BackNavigationContext = React.createContext<BackNavigationApi | undefined>(undefined);

export function BackNavigationContextProvider({ children }: { children: React.ReactElement }) {
  const { pathname, search } = useLocation();

  // Stored as a single concatenated string, not an object. React's Object.is bailout only fires
  // for primitives, so an object value would cause a re-render on every effect run even when the
  // URL has not changed.
  const [lastVisitedRoute, setLastVisitedRoute] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Back-target routes are not recorded. The rule is a denylist (skip iff the pathname is a
    // back-target route), not an allowlist. New content routes become recordable automatically
    // without touching this file.
    if (hasBackNavigation(pathname)) {
      return;
    }
    setLastVisitedRoute(pathname + search);
  }, [pathname, search]);

  const value = useMemo(() => ({ lastVisitedRoute }), [lastVisitedRoute]);

  return <BackNavigationContext.Provider value={value}>{children}</BackNavigationContext.Provider>;
}
