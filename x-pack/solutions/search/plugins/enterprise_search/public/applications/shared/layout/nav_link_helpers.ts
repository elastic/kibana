/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';

import { stripTrailingSlash } from '../../../../common/strip_slashes';

import { KibanaLogic } from '../kibana';
import {
  type GeneratedReactRouterProps,
  generateReactRouterProps,
} from '../react_router_helpers/generate_react_router_props';
import { ReactRouterProps } from '../types';

interface Params {
  items?: Array<EuiSideNavItemTypeEnhanced<unknown>>; // Primarily passed if using `items` to determine isSelected - if not, you can just set `items` outside of this helper
  shouldShowActiveForSubroutes?: boolean;
  to: string;
}

type NavLinkProps<T> = GeneratedReactRouterProps<T> &
  Pick<EuiSideNavItemTypeEnhanced<T>, 'isSelected' | 'items'>;

export type GenerateNavLinkParameters = Params & ReactRouterProps;

export const generateNavLink = ({
  items,
  ...rest
}: GenerateNavLinkParameters): NavLinkProps<unknown> => {
  const linkProps = {
    ...generateReactRouterProps({ ...rest }),
    isSelected: getNavLinkActive({ items, ...rest }),
  };
  return items ? { ...linkProps, items } : linkProps;
};

export const getNavLinkActive = ({
  to,
  shouldShowActiveForSubroutes = false,
  items = [],
  shouldNotCreateHref = false,
  shouldNotPrepend = false,
}: GenerateNavLinkParameters): boolean => {
  const { pathname } = KibanaLogic.values.history.location;
  const currentPath = stripTrailingSlash(pathname);
  const { href: currentPathHref } = generateReactRouterProps({
    shouldNotCreateHref: false,
    to: currentPath,
  });
  const { href: toHref } = generateReactRouterProps({ shouldNotCreateHref, shouldNotPrepend, to });

  if (currentPathHref === toHref) return true;

  if (shouldShowActiveForSubroutes) {
    if (items.length) return false; // If a nav link has sub-nav items open, never show it as active
    if (currentPathHref.startsWith(toHref)) return true;
  }

  return false;
};
