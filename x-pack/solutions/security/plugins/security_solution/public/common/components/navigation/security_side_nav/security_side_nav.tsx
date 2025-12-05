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
import { SecurityPageName } from '@kbn/security-solution-navigation';
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
  id === SecurityPageName.administration || id === SecurityPageName.launchpad
    ? SolutionSideNavItemPosition.bottom
    : SolutionSideNavItemPosition.top;

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (
  navLink: NavigationLink,
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => {
  const navigationProps = navLink.id
    ? getSecuritySolutionLinkProps({ deepLinkId: navLink.id as SecurityPageName })
    : { href: '#', onClick: undefined };

  return {
    id: navLink.id,
    label: navLink.title,
    position: getNavItemPosition(navLink.id),
    ...navigationProps,
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
  };
};

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
const useSolutionSideNavItems = () => {
  const navLinks = useNavLinks();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

  const sideNavItems = useMemo(() => {
    if (!navLinks?.length) {
      return undefined;
    }

    // Format nav links and separate by position
    const topFormattedItems: SolutionSideNavItem[] = [];
    const bottomFormattedItems: SolutionSideNavItem[] = [];

    for (const navLink of navLinks) {
      if (!navLink.disabled) {
        const item = formatLink(navLink, getSecuritySolutionLinkProps);
        if (item.position === SolutionSideNavItemPosition.bottom) {
          bottomFormattedItems.push(item);
        } else {
          topFormattedItems.push(item);
        }
      }
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
