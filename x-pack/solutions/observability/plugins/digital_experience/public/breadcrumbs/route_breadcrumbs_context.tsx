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

export interface RouteBreadcrumb {
  title: string;
  href?: string;
}

interface RouteBreadcrumbsApi {
  set(route: Route, breadcrumbs: RouteBreadcrumb[]): void;
  unset(route: Route): void;
}

export const RouteBreadcrumbsContext = createContext<RouteBreadcrumbsApi | undefined>(undefined);

/** Joins the breadcrumbs registered by each matched route, outermost first. */
export const toChromeBreadcrumbs = (
  matches: RouteMatch[],
  registered: ReadonlyMap<Route, RouteBreadcrumb[]>
): ChromeBreadcrumb[] => {
  const breadcrumbs = matches.flatMap(({ route }) => registered.get(route) ?? []);
  const parents = breadcrumbs.slice(0, -1);
  const [current] = breadcrumbs.slice(-1);

  return [
    ...parents.map(({ title, href }) => ({ text: title, href })),
    // The current page is the last breadcrumb and never links to itself.
    ...(current ? [{ text: current.title }] : []),
  ];
};

/**
 * Collects the breadcrumbs each matched route registers with `useRouteBreadcrumb` and sets them
 * through observability's `useBreadcrumbs` (Observability root crumb, page title, serverless).
 */
export function RouteBreadcrumbsContextProvider({ children }: { children: React.ReactNode }) {
  const [registered, setRegistered] = useState<ReadonlyMap<Route, RouteBreadcrumb[]>>(new Map());
  const matches = useMatchRoutes();

  const api = useMemo<RouteBreadcrumbsApi>(
    () => ({
      set: (route, breadcrumbs) =>
        setRegistered((current) =>
          isEqual(current.get(route), breadcrumbs)
            ? current
            : new Map(current).set(route, breadcrumbs)
        ),
      unset: (route) =>
        setRegistered((current) => {
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
    () => toChromeBreadcrumbs(matches, registered),
    [matches, registered]
  );
  useBreadcrumbs(breadcrumbs);

  return (
    <RouteBreadcrumbsContext.Provider value={api}>{children}</RouteBreadcrumbsContext.Provider>
  );
}
