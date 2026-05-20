/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import {
  LinkCategoryType,
  SecurityGroupName,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { i18nStrings } from '@kbn/security-solution-navigation/links';
import {
  SolutionSideNav,
  type SolutionSideNavItem,
  SolutionSideNavItemPosition,
} from '@kbn/security-solution-side-nav';
import useObservable from 'react-use/lib/useObservable';
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../../../common/constants';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { type GetSecuritySolutionLinkProps, useGetSecuritySolutionLinkProps } from '../../links';
import { useNavLinks } from '../../../links/nav_links';
import type { NavigationLink } from '../../../links/types';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { getNavCategories } from './categories';
import { useParentLinks } from '../../../links/links_hooks';
import { CLASSIC_LAUNCHPAD_PANEL_LINK_ENTRIES } from '../../../../onboarding/links';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

export const EUI_HEADER_HEIGHT = '93px';

const flattenNavigationLinks = (links: NavigationLink[]): NavigationLink[] =>
  links.flatMap((link) => [
    link,
    ...(link.links?.length ? flattenNavigationLinks(link.links) : []),
  ]);
export const BOTTOM_BAR_HEIGHT = '50px';

const getNavItemPosition = (id: SecurityPageName): SolutionSideNavItemPosition => {
  return id === SecurityPageName.administration
    ? SolutionSideNavItemPosition.bottom
    : SolutionSideNavItemPosition.top;
};

const LAUNCHPAD_PAGES: ReadonlySet<SecurityPageName> = new Set([
  SecurityPageName.landing,
  SecurityPageName.siemReadiness,
  SecurityPageName.aiValue,
  SecurityPageName.siemMigrationsManage,
  SecurityPageName.siemMigrationsRules,
  SecurityPageName.siemMigrationsDashboards,
]);

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (
  navLink: NavigationLink,
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => {
  const stripDashboardsPanel = navLink.id === SecurityPageName.dashboards;

  return {
    id: navLink.id,
    label: navLink.title,
    position: getNavItemPosition(navLink.id),
    ...getSecuritySolutionLinkProps({ deepLinkId: navLink.id }),
    ...(navLink.sideNavIcon && { iconType: navLink.sideNavIcon }),
    ...(navLink.categories?.length && !stripDashboardsPanel && { categories: navLink.categories }),
    ...(navLink.links?.length &&
      !stripDashboardsPanel && {
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

const useSolutionSideNavItems = (): SolutionSideNavItem<string>[] | undefined => {
  const navLinks = useNavLinks();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const classicFooterItems = useMemo((): SolutionSideNavItem[] | null => {
    const flatNavLinks = flattenNavigationLinks(navLinks);
    const authorizedNavById = new Map(
      flatNavLinks
        .filter((link) => !link.disabled && !link.unauthorized)
        .map((link) => [link.id, link])
    );

    const areMigrationLinks = (id: SecurityPageName) =>
      [
        SecurityPageName.siemMigrationsManage,
        SecurityPageName.siemMigrationsRules,
        SecurityPageName.siemMigrationsDashboards,
      ].includes(id);

    const { launchpadPanelItems, launchpadCategories } =
      CLASSIC_LAUNCHPAD_PANEL_LINK_ENTRIES.reduce<{
        launchpadPanelItems: SolutionSideNavItem[];
        launchpadCategories: Array<{ type: LinkCategoryType; label?: string; linkIds: string[] }>;
      }>(
        (acc, { id: pageId }) => {
          const source = authorizedNavById.get(pageId);
          if (source == null) {
            return acc;
          }

          const item: SolutionSideNavItem = {
            id: pageId,
            label: source.title,
            ...getSecuritySolutionLinkProps({ deepLinkId: pageId }),
          };

          acc.launchpadPanelItems.push(item);

          // Initialize categories on first item
          if (acc.launchpadPanelItems.length === 1) {
            acc.launchpadCategories = [
              {
                type: LinkCategoryType.separator,
                label: undefined,
                linkIds: [],
              },
              {
                type: LinkCategoryType.title,
                label: i18nStrings.launchPad.migrations.title,
                linkIds: [],
              },
            ];
          }

          // Categorize the item
          if (acc.launchpadCategories.length > 0) {
            if (areMigrationLinks(pageId)) {
              acc.launchpadCategories[1].linkIds.push(pageId);
            } else {
              acc.launchpadCategories[0].linkIds.push(pageId);
            }
          }

          return acc;
        },
        { launchpadPanelItems: [], launchpadCategories: [] }
      );

    const launchpad: SolutionSideNavItem | null =
      launchpadPanelItems.length > 0
        ? {
            id: SecurityGroupName.launchpad,
            label: i18nStrings.launchPad.title,
            iconType: undefined,
            position: SolutionSideNavItemPosition.bottom,
            items: launchpadPanelItems,
            categories: launchpadCategories,
            prependSeparator: true,
            ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.landing }),
          }
        : null;

    const administrationNavLink = navLinks.find(({ id }) => id === SecurityPageName.administration);
    const administrationFooter: SolutionSideNavItem | null =
      administrationNavLink != null && !administrationNavLink.disabled
        ? {
            ...formatLink(administrationNavLink, getSecuritySolutionLinkProps),
            iconType: undefined,
            position: SolutionSideNavItemPosition.bottom,
          }
        : null;

    return [
      ...(launchpad != null ? [launchpad] : []),
      ...(administrationFooter != null ? [administrationFooter] : []),
    ];
  }, [navLinks, getSecuritySolutionLinkProps]);

  const sideNavItems = useMemo(() => {
    if (!navLinks?.length) {
      return undefined;
    }

    const excluded = new Set(LAUNCHPAD_PAGES);

    const bodyItems = navLinks.reduce<SolutionSideNavItem[]>((navItems, navLink) => {
      if (navLink.disabled) {
        return navItems;
      }
      if (excluded?.has(navLink.id)) {
        return navItems;
      }

      if (navLink.id === SecurityPageName.administration) {
        return navItems;
      }

      navItems.push(formatLink(navLink, getSecuritySolutionLinkProps));

      return navItems;
    }, []);

    return [...bodyItems, ...(classicFooterItems ? classicFooterItems : [])];
  }, [navLinks, getSecuritySolutionLinkProps, classicFooterItems]);

  return sideNavItems;
};

const useSelectedId = (): string => {
  const [{ pageName }] = useRouteSpy();
  const [rootLinkInfo] = useParentLinks(pageName);

  if (LAUNCHPAD_PAGES.has(pageName)) {
    return SecurityGroupName.launchpad;
  }

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
  const { uiSettings } = useKibana().services;
  const isNewEAHomePageEnabled = useIsExperimentalFeatureEnabled(
    'entityAnalyticsNewHomePageEnabled'
  );
  const items = useSolutionSideNavItems();
  const selectedId = useSelectedId();
  const panelTopOffset = usePanelTopOffset();
  const panelBottomOffset = usePanelBottomOffset();

  const categories = useMemo(() => {
    const enableAlertsAndAttacksAlignment = uiSettings.get(
      ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
      false
    );
    return getNavCategories(enableAlertsAndAttacksAlignment, isNewEAHomePageEnabled);
  }, [uiSettings, isNewEAHomePageEnabled]);

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
