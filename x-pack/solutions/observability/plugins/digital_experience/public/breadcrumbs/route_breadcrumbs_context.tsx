/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { Route, RouteMatch } from '@kbn/typed-react-router-config';
import { useMatchRoutes } from '@kbn/typed-react-router-config';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

export type RouteBreadcrumb = Pick<ChromeBreadcrumb, 'text' | 'href'>;

interface RouteBreadcrumbsApi {
  set(route: Route, breadcrumbs: RouteBreadcrumb[]): void;
  unset(route: Route): void;
}

export const RouteBreadcrumbsContext = createContext<RouteBreadcrumbsApi | undefined>(undefined);

/** Joins each matched route's crumbs, leaving the current page (the last crumb) unlinked. */
const toChromeBreadcrumbs = (
  matchedRoutes: RouteMatch[],
  breadcrumbsByRoute: ReadonlyMap<Route, RouteBreadcrumb[]>
): ChromeBreadcrumb[] => {
  // The order comes from the route tree (matches go root → leaf), not from when each page registered.
  const breadcrumbs = matchedRoutes.flatMap(({ route }) => breadcrumbsByRoute.get(route) ?? []);

  return breadcrumbs.map(({ text, href }, index) => {
    const isCurrentPage = index === breadcrumbs.length - 1;
    if (isCurrentPage) {
      return { text };
    }
    return { text, href };
  });
};

/**
 * Each route registers its crumbs with `useRouteBreadcrumb`; this joins them in route-tree order and
 * sets them through Observability's `useBreadcrumbs`.
 */
export function RouteBreadcrumbsContextProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbsByRoute, setBreadcrumbsByRoute] = useState<
    ReadonlyMap<Route, RouteBreadcrumb[]>
  >(new Map());
  const matches = useMatchRoutes();

  const api = useMemo<RouteBreadcrumbsApi>(
    () => ({
      set: (route, breadcrumbs) =>
        setBreadcrumbsByRoute((current) =>
          isEqual(current.get(route), breadcrumbs)
            ? current
            : new Map(current).set(route, breadcrumbs)
        ),
      unset: (route) =>
        setBreadcrumbsByRoute((current) => {
          if (!current.has(route)) {
            return current;
          }
          const next = new Map(current);
          next.delete(route);
          return next;
        }),
    }),
    []
  );

  const breadcrumbs = useMemo(
    () => toChromeBreadcrumbs(matches, breadcrumbsByRoute),
    [matches, breadcrumbsByRoute]
  );
  useBreadcrumbs(breadcrumbs);

  return (
    <RouteBreadcrumbsContext.Provider value={api}>{children}</RouteBreadcrumbsContext.Provider>
  );
}
