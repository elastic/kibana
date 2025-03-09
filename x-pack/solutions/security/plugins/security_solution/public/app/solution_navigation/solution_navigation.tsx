/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { CoreStart } from '@kbn/core/public';
import { CATEGORIES, FOOTER_CATEGORIES } from './categories';
import { formatNavigationTree } from './navigation_tree';
import { navLinks$ } from '../../common/links/nav_links';

export const withNavigationProvider = <T extends object>(
  Component: React.ComponentType<T>,
  core: CoreStart
) =>
  function WithNavigationProvider(props: T) {
    return (
      <NavigationProvider core={core}>
        <Component {...props} />
      </NavigationProvider>
    );
  };

export interface SolutionNavigation {
  navigationTree$: Observable<NavigationTreeDefinition>;
}

export const getSolutionNavigation = (_core: CoreStart): SolutionNavigation => {
  const navigationTree$ = navLinks$.pipe(
    map((solutionNavLinks) => formatNavigationTree(solutionNavLinks, CATEGORIES, FOOTER_CATEGORIES))
  );

  return { navigationTree$ };
};
