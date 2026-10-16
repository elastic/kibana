/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useCurrentRoute } from '@kbn/typed-react-router-config';
import type { RouteBreadcrumb } from './route_breadcrumbs_context';
import { RouteBreadcrumbsContext } from './route_breadcrumbs_context';

/** Registers the breadcrumbs of the route this component is rendered in. */
export const useRouteBreadcrumb = (breadcrumbs: RouteBreadcrumb[]): void => {
  const api = useContext(RouteBreadcrumbsContext);
  if (!api) {
    throw new Error('useRouteBreadcrumb must be used inside RouteBreadcrumbsContextProvider');
  }

  const { match } = useCurrentRoute();
  const route = match?.route;

  // Runs on every new array; the provider ignores crumbs equal to the stored ones, so callers
  // can pass a plain array without memoizing it.
  useEffect(() => {
    if (route) {
      api.set(route, breadcrumbs);
    }
  }, [api, route, breadcrumbs]);

  // Unregisters only when the component unmounts or moves to another route.
  useEffect(() => {
    if (!route) {
      return;
    }
    return () => api.unset(route);
  }, [api, route]);
};
