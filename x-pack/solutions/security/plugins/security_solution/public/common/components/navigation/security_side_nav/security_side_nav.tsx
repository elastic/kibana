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

const getNavItemPosition = (id: SecurityPageName): SolutionSideNavItemPosition =>
  id === SecurityPageName.administration
    ? SolutionSideNavItemPosition.bottom
    : SolutionSideNavItemPosition.top;

const isLaunchpadNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing ||
  id === SecurityPageName.siemReadiness ||
  id === SecurityPageName.aiValue;

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (
  navLink: NavigationLink,
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => ({
  id: navLink.id,
  label: navLink.title,
  position: getNavItemPosition(navLink.id),
  ...getSecuritySolutionLinkProps({ deepLinkId: navLink.id }),
  ...(navLink.sideNavIcon && { iconType: navLink.sideNavIcon }),
  ...(navLink.categories?.length && { categories: navLink.categories }),
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
});

/**
 * Formats Launchpad navigation item with children (Get started, SIEM Readiness, Value report)
 */
const formatLaunchpadItem = (
  launchpadNavLinks: NavigationLink[],
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => {
  // Find landing link once for reuse (only non-disabled links)
  const landingLink =
    launchpadNavLinks.find((link) => link.id === SecurityPageName.landing && !link.disabled) ??
    launchpadNavLinks.find((link) => !link.disabled);

  if (!landingLink) {
    // Fallback: return minimal item if no valid (non-disabled) links
    return {
      id: SecurityGroupName.launchpad,
      label: i18nStrings.launchPad.title,
      position: SolutionSideNavItemPosition.bottom,
      appendSeparator: true,
      items: [],
      href: '#',
    };
  }

  const landingLinkProps = getSecuritySolutionLinkProps({ deepLinkId: landingLink.id });

  // Format children, excluding disabled links
  const children = launchpadNavLinks
    .filter((link) => !link.disabled)
    .map((link) => ({
      id: link.id,
      label: link.title,
      ...(link.id !== SecurityPageName.landing &&
        link.sideNavIcon && { iconType: link.sideNavIcon }),
      ...getSecuritySolutionLinkProps({ deepLinkId: link.id }),
    }));

  // Create onClick handler that navigates to Get started AND opens the panel
  const launchpadOnClick: React.MouseEventHandler = (ev) => {
    // Navigate to Get started page
    landingLinkProps.onClick?.(ev);

    // Open the panel by triggering click on the panel opener button (rocket icon)
    // Use setTimeout to ensure navigation happens first, then panel opens
    setTimeout(() => {
      const panelButton = document.querySelector(
        `[data-test-subj="solutionSideNavItemButton-${SecurityGroupName.launchpad}"]`
      ) as HTMLElement;
      if (panelButton && !panelButton.classList.contains('euiButtonIcon-isSelected')) {
        panelButton.click();
      }
    }, 100);
  };

  return {
    id: SecurityGroupName.launchpad,
    label: i18nStrings.launchPad.title,
    panelOpenerIconType: 'launch',
    position: SolutionSideNavItemPosition.bottom,
    appendSeparator: true,
    items: children,
    href: landingLinkProps.href,
    onClick: launchpadOnClick,
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

    // Separate Launchpad items from regular items in a single pass
    // Note: We collect Launchpad items even if disabled, so we can create the Launchpad group
    // formatLaunchpadItem will filter out disabled items from children
    const launchpadNavLinks: NavigationLink[] = [];
    const regularNavLinks: NavigationLink[] = [];

    for (const navLink of navLinks) {
      if (isLaunchpadNavItem(navLink.id)) {
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

    // Add Launchpad item before other bottom items (so it appears above Manage)
    if (launchpadNavLinks.length > 0) {
      bottomFormattedItems.unshift(
        formatLaunchpadItem(launchpadNavLinks, getSecuritySolutionLinkProps)
      );
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
