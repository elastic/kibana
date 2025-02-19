/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MouseEvent } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { ChromeNavLink, EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';

import type { ClassicNavItem, ClassicNavItemDeepLink } from './types';
import { stripTrailingSlash } from './utils';

type DeepLinksMap = Record<string, ChromeNavLink | undefined>;
type SolutionNavItems = SolutionNavProps['items'];

export const classicNavigationFactory = (
  classicItems: ClassicNavItem[],
  core: CoreStart,
  history: ScopedHistory<unknown>
): SolutionNavProps | undefined => {
  const navLinks = core.chrome.navLinks.getAll();
  const deepLinks = navLinks.reduce((links: DeepLinksMap, link: ChromeNavLink) => {
    links[link.id] = link;
    return links;
  }, {});

  const currentPath = stripTrailingSlash(history.location.pathname);
  const currentLocation = history.createHref({ pathname: currentPath });
  const items: SolutionNavItems = generateSideNavItems(
    classicItems,
    core,
    deepLinks,
    currentLocation
  );

  return {
    items,
    icon: 'logoEnterpriseSearch',
    name: i18n.translate('xpack.searchNavigation.classicNav.name', {
      defaultMessage: 'Elasticsearch',
    }),
  };
};

function generateSideNavItems(
  classicItems: ClassicNavItem[],
  core: CoreStart,
  deepLinks: DeepLinksMap,
  currentLocation: string
): SolutionNavItems {
  const result: SolutionNavItems = [];

  for (const navItem of classicItems) {
    let children: SolutionNavItems | undefined;

    const { deepLink, items, ...rest } = navItem;
    if (items) {
      children = generateSideNavItems(items, core, deepLinks, currentLocation);
    }

    let item: EuiSideNavItemTypeEnhanced<{}> | undefined;
    if (deepLink) {
      const sideNavProps = getSideNavItemLinkProps(deepLink, deepLinks, core, currentLocation);
      if (sideNavProps) {
        const { name, ...linkProps } = sideNavProps;
        item = {
          ...rest,
          ...linkProps,
          name: navItem?.name ?? name,
        };
      }
    } else {
      item = {
        ...rest,
        items: children,
        name: navItem.name,
      };
    }

    if (isValidSideNavItem(item)) {
      result.push(item);
    }
  }

  return result;
}

function isValidSideNavItem(
  item: EuiSideNavItemTypeEnhanced<unknown> | undefined
): item is EuiSideNavItemTypeEnhanced<unknown> {
  if (item === undefined) return false;
  if (item.href || item.onClick) return true;
  if (item?.items?.length ?? 0 > 0) return true;

  return false;
}

function getSideNavItemLinkProps(
  { link, shouldShowActiveForSubroutes }: ClassicNavItemDeepLink,
  deepLinks: DeepLinksMap,
  core: CoreStart,
  currentLocation: string
) {
  const deepLink = deepLinks[link];
  if (!deepLink || !deepLink.url) return undefined;
  const isSelected = Boolean(
    deepLink.url === currentLocation ||
      (shouldShowActiveForSubroutes && currentLocation.startsWith(deepLink.url))
  );

  return {
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      core.application.navigateToUrl(deepLink.url);
    },
    href: deepLink.url,
    name: deepLink.title,
    isSelected,
  };
}
