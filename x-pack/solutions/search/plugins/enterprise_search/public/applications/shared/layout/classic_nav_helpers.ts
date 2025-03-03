/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeNavLink, EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';
import type { ClassicNavItem } from '@kbn/search-navigation/public';

import type { GenerateNavLinkFromDeepLinkParameters, GenerateNavLinkParameters } from '../types';

import { generateNavLink } from './nav_link_helpers';

export const generateSideNavItems = (
  navItems: ClassicNavItem[],
  deepLinks: Record<string, ChromeNavLink | undefined>,
  subItemsMap: Record<string, Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined> = {}
): Array<EuiSideNavItemTypeEnhanced<unknown>> => {
  const sideNavItems: Array<EuiSideNavItemTypeEnhanced<unknown>> = [];

  for (const navItem of navItems) {
    let sideNavChildItems: Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined;

    const { deepLink, items, ...rest } = navItem;
    const subItems = subItemsMap?.[navItem.id];

    if (items || subItems) {
      sideNavChildItems = [];
      if (items) {
        sideNavChildItems.push(...generateSideNavItems(items, deepLinks, subItemsMap));
      }
      if (subItems) {
        sideNavChildItems.push(...subItems);
      }
    }

    let sideNavItem: EuiSideNavItemTypeEnhanced<unknown> | undefined;
    if (deepLink) {
      const navLinkParams = getNavLinkParameters(deepLink, deepLinks);
      if (navLinkParams !== undefined) {
        const name = navItem.name ?? getDeepLinkTitle(deepLink.link, deepLinks);
        sideNavItem = {
          ...rest,
          name,
          ...generateNavLink({
            ...navLinkParams,
            items: sideNavChildItems,
          }),
        };
      }
    } else {
      sideNavItem = {
        ...rest,
        items: sideNavChildItems,
        name: navItem.name,
      };
    }

    if (isValidSideNavItem(sideNavItem)) {
      sideNavItems.push(sideNavItem);
    }
  }

  return sideNavItems;
};

const getNavLinkParameters = (
  navLink: GenerateNavLinkFromDeepLinkParameters,
  deepLinks: Record<string, ChromeNavLink | undefined>
): GenerateNavLinkParameters | undefined => {
  const { link, ...navLinkProps } = navLink;
  const deepLink = deepLinks[link];
  if (!deepLink || !deepLink.url) return undefined;
  return {
    ...navLinkProps,
    shouldNotCreateHref: true,
    shouldNotPrepend: true,
    to: deepLink.url,
  };
};
const getDeepLinkTitle = (
  link: string,
  deepLinks: Record<string, ChromeNavLink | undefined>
): string | undefined => {
  const deepLink = deepLinks[link];
  if (!deepLink || !deepLink.url) return undefined;
  return deepLink.title;
};

function isValidSideNavItem(
  item: EuiSideNavItemTypeEnhanced<unknown> | undefined
): item is EuiSideNavItemTypeEnhanced<unknown> {
  if (item === undefined) return false;
  if (item.href || item.onClick) return true;
  if (item?.items?.length ?? 0 > 0) return true;

  return false;
}
