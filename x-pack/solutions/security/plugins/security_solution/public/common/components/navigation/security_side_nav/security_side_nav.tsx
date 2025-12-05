/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import {
  SolutionSideNav,
  SolutionSideNavItemPosition,
  type SolutionSideNavItem,
} from '@kbn/security-solution-side-nav';
import useObservable from 'react-use/lib/useObservable';
import { SecurityGroupName, SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings } from '@kbn/security-solution-navigation/links';
import { ATTACKS_ALERTS_ALIGNMENT_ENABLED } from '../../../../../common/constants';
import type { NavigationLink } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useGetSecuritySolutionLinkProps, type GetSecuritySolutionLinkProps } from '../../links';
import { useNavLinks } from '../../../links/nav_links';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { getNavCategories } from './categories';
import { useParentLinks } from '../../../links/links_hooks';

export const EUI_HEADER_HEIGHT = '93px';
export const BOTTOM_BAR_HEIGHT = '50px';

const getNavItemPosition = (
  id: SecurityPageName | SecurityGroupName
): SolutionSideNavItemPosition =>
  id === SecurityPageName.administration || id === SecurityGroupName.launchpad
    ? SolutionSideNavItemPosition.bottom
    : SolutionSideNavItemPosition.top;

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (
  navLink:
    | NavigationLink
    | { id: SecurityGroupName.launchpad; title: string; links: NavigationLink[] },
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => {
  // Handle SecurityGroupName items (like launchpad) that use a landing page for navigation
  const isGroupItem = navLink.id === SecurityGroupName.launchpad;
  const landingPageId =
    isGroupItem && navLink.links?.length
      ? navLink.links.find((link) => link.id === SecurityPageName.landing && !link.disabled)?.id ??
        navLink.links.find((link) => !link.disabled)?.id
      : navLink.id;

  const navigationProps = landingPageId
    ? getSecuritySolutionLinkProps({ deepLinkId: landingPageId as SecurityPageName })
    : { href: '#', onClick: undefined };

  return {
    id: navLink.id,
    label: navLink.title,
    position: getNavItemPosition(navLink.id),
    ...navigationProps,
    ...(navLink.sideNavIcon && { iconType: navLink.sideNavIcon }),
    ...(navLink.categories?.length && { categories: navLink.categories }),
    ...(isGroupItem && { appendSeparator: true }),
    ...(navLink.links?.length && {
      items: navLink.links.reduce<SolutionSideNavItem[]>((acc, current) => {
        if (!current.disabled) {
          acc.push({
            id: current.id,
            label: current.title,
            iconType: current.sideNavIcon,
            isBeta: current.isBeta,
            betaOptions: current.betaOptions,
            ...getSecuritySolutionLinkProps({ deepLinkId: current.id }),
          });
        }
        return acc;
      }, []),
    }),
  };
};

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
const useSolutionSideNavItems = () => {
  const navLinks = useNavLinks();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const sideNavItems = useMemo(() => {
    if (!navLinks?.length) {
      return undefined;
    }

    // Group launchpad items together to match the navigation tree structure
    const launchpadPageIds = new Set([
      SecurityPageName.landing,
      SecurityPageName.siemReadiness,
      SecurityPageName.aiValue,
    ]);
    const launchpadNavLinks: NavigationLink[] = [];
    const regularNavLinks: NavigationLink[] = [];

    for (const navLink of navLinks) {
      if (launchpadPageIds.has(navLink.id)) {
        launchpadNavLinks.push(navLink);
      } else if (!navLink.disabled) {
        regularNavLinks.push(navLink);
      }
    }

    // Format regular nav links and separate by position in a single pass
    const topFormattedItems: SolutionSideNavItem[] = [];
    const bottomFormattedItems: SolutionSideNavItem[] = [];

    for (const navLink of regularNavLinks) {
      const item = formatLink(navLink, getSecuritySolutionLinkProps);
      if (item.position === SolutionSideNavItemPosition.bottom) {
        bottomFormattedItems.push(item);
      } else {
        topFormattedItems.push(item);
      }
    }

    // Create launchpad group item from navigation tree structure
    if (launchpadNavLinks.length > 0) {
      const launchpadGroupLink = {
        id: SecurityGroupName.launchpad,
        title: i18nStrings.launchPad.title,
        links: launchpadNavLinks.filter((link) => !link.disabled),
      } as const;
      const launchpadItem = formatLink(launchpadGroupLink, getSecuritySolutionLinkProps);
      bottomFormattedItems.unshift(launchpadItem);
    }

    return [...topFormattedItems, ...bottomFormattedItems];
  }, [navLinks, getSecuritySolutionLinkProps]);

  return sideNavItems;
};

const useSelectedId = (): SecurityPageName => {
  const [{ pageName }] = useRouteSpy();
  const [rootLinkInfo] = useParentLinks(pageName);
  return rootLinkInfo?.id ?? '';
};

const usePanelTopOffset = (): string | undefined => {
  const {
    chrome: { hasHeaderBanner$ },
  } = useKibana().services;
  const hasHeaderBanner = useObservable(hasHeaderBanner$());
  const { euiTheme } = useEuiTheme();
  return hasHeaderBanner ? `calc(${EUI_HEADER_HEIGHT} + ${euiTheme.size.xl})` : undefined;
};

const usePanelBottomOffset = (): string | undefined => {
  const isPolicySettingsVisible = useIsPolicySettingsBarVisible();
  const [isTimelineBottomBarVisible] = useShowTimeline();
  return isTimelineBottomBarVisible || isPolicySettingsVisible ? BOTTOM_BAR_HEIGHT : undefined;
};

/**
 * Main security navigation component.
 * It takes the links to render from the generic application `links` configs.
 */
export const SecuritySideNav: React.FC = () => {
  const { featureFlags } = useKibana().services;
  const items = useSolutionSideNavItems();
  const selectedId = useSelectedId();
  const panelTopOffset = usePanelTopOffset();
  const panelBottomOffset = usePanelBottomOffset();

  const categories = useMemo(() => {
    const attacksAlertsAlignmentEnabled = featureFlags.getBooleanValue(
      ATTACKS_ALERTS_ALIGNMENT_ENABLED,
      false
    );
    return getNavCategories(attacksAlertsAlignmentEnabled);
  }, [featureFlags]);

  if (!items) {
    return <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />;
  }

  return (
    <SolutionSideNav
      items={items}
      categories={categories}
      selectedId={selectedId}
      panelTopOffset={panelTopOffset}
      panelBottomOffset={panelBottomOffset}
      tracker={track}
    />
  );
};
