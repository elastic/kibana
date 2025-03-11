/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNavigationPropsFromId } from '@kbn/security-solution-navigation';
import { useCallback, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { APP_PATH } from '../../../common';
import { useBasePath, useAppUrl } from '../lib/kibana';
import type { NavigationLink } from './types';

/**
 * It returns the first nav item that matches the current pathname.
 * It compares the pathname and nav item using `startsWith`,
 * meaning that the pathname: `/hosts/anomalies` matches the nav item URL `/hosts`.
 */
export const useFindAppLinksByPath = (navLinks: NavigationLink[] | undefined) => {
  const { getAppUrl } = useAppUrl();
  const basePath = useBasePath();
  const { pathname } = useLocation();

  const isCurrentPathItem = useCallback(
    (navItem: NavigationLink) => {
      const { appId, deepLinkId } = getNavigationPropsFromId(navItem.id);
      const appUrl = getAppUrl({ appId, deepLinkId });
      return !!matchPath(`${basePath}${APP_PATH}${pathname}`, { path: appUrl, strict: false });
    },
    [basePath, getAppUrl, pathname]
  );

  return useMemo(() => findNavItem(isCurrentPathItem, navLinks), [navLinks, isCurrentPathItem]);
};

/**
 * DFS to find the first nav item that matches the current pathname.
 * Case the leaf node does not match the pathname; we return the nearest parent node that does.
 *
 * @param predicate calls predicate once for each element of the tree, until it finds one where predicate returns true.
 */
const findNavItem = (
  predicate: (navItem: NavigationLink) => boolean,
  navItems: NavigationLink[] | undefined
): NavigationLink | null => {
  if (!navItems) return null;

  for (const navItem of navItems) {
    if (navItem.links?.length) {
      const foundItem = findNavItem(predicate, navItem.links);
      if (foundItem) return foundItem;
    }

    if (predicate(navItem)) {
      return navItem;
    }
  }
  return null;
};
