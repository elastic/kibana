/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentRoute } from '@kbn/typed-react-router-config';
import { useContext, useEffect, useRef } from 'react';
import type { Breadcrumb } from '.';
import { RouteBreadcrumbsContext } from '.';

export function useRouteBreadcrumb(breadcrumb: Breadcrumb) {
  const api = useContext(RouteBreadcrumbsContext);

  if (!api) {
    throw new Error('Missing Breadcrumb API in context');
  }

  const { match } = useCurrentRoute();

  const matchedRoute = useRef(match?.route);

  // Destructure the breadcrumb object to avoid the useEffect dependency array from changing on every render due to object reference changes.
  // This way callers don't need to memoize the object they pass to this hook, and we can still ensure the effect only runs when the breadcrumb values actually change.
  const { title, href } = breadcrumb;

  useEffect(() => {
    if (matchedRoute.current && matchedRoute.current !== match?.route) {
      api.unset(matchedRoute.current);
    }

    matchedRoute.current = match?.route;

    if (matchedRoute.current) {
      api.set(matchedRoute.current, [{ title, href }]);
    }

    return () => {
      if (matchedRoute.current) {
        api.unset(matchedRoute.current);
      }
    };
  }, [match?.route, title, href, api]);
}
