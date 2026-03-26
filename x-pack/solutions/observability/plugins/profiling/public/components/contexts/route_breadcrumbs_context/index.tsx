/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Route, RouteMatch } from '@kbn/typed-react-router-config';
import { useMatchRoutes } from '@kbn/typed-react-router-config';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { compact, isEqual } from 'lodash';
import React, { createContext, useMemo, useState } from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

export interface Breadcrumb {
  title: string;
  href: string;
}

interface BreadcrumbApi {
  set(route: Route, breadcrumb: Breadcrumb[]): void;
  unset(route: Route): void;
  getBreadcrumbs(matches: RouteMatch[]): Breadcrumb[];
}

export const RouteBreadcrumbsContext = createContext<BreadcrumbApi | undefined>(undefined);

export function RouteBreadcrumbsContextProvider({ children }: { children: React.ReactElement }) {
  const [, forceUpdate] = useState({});

  const breadcrumbs = useMemo(() => {
    return new Map<Route, Breadcrumb[]>();
  }, []);

  const matches: RouteMatch[] = useMatchRoutes();

  const api = useMemo<BreadcrumbApi>(
    () => ({
      set(route, breadcrumb) {
        if (!isEqual(breadcrumbs.get(route), breadcrumb)) {
          breadcrumbs.set(route, breadcrumb);
          forceUpdate({});
        }
      },
      unset(route) {
        if (breadcrumbs.has(route)) {
          breadcrumbs.delete(route);
          forceUpdate({});
        }
      },
      getBreadcrumbs(currentMatches: RouteMatch[]) {
        return compact(
          currentMatches.flatMap((match) => {
            const breadcrumb = breadcrumbs.get(match.route);

            return breadcrumb;
          })
        );
      },
    }),
    [breadcrumbs]
  );

  const formattedBreadcrumbs: ChromeBreadcrumb[] = api
    .getBreadcrumbs(matches)
    .map((breadcrumb, index, array) => {
      return {
        text: breadcrumb.title,
        ...(index === array.length - 1
          ? {}
          : {
              href: breadcrumb.href,
            }),
      };
    });

  // Filter out the "Universal Profiling" breadcrumb because it is included in the breadcrumbs already in case of the project navigation
  const projectStyleBreadcrumbs = formattedBreadcrumbs.filter(
    (breadcrumb) => String(breadcrumb?.text).toLocaleLowerCase() !== 'universal profiling'
  );

  useBreadcrumbs(projectStyleBreadcrumbs, {
    absoluteProjectStyleBreadcrumbs: false,
    classicOnly: false,
  });

  // Keep using breadcrumbs for the Profiling app for classic navigation
  useBreadcrumbs(formattedBreadcrumbs, { classicOnly: true });

  return (
    <RouteBreadcrumbsContext.Provider value={api}>{children}</RouteBreadcrumbsContext.Provider>
  );
}
