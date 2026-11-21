/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import {
  ALERTZERO_APP_ID,
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
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
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

/**
 * AlertZero is its own app. Its pages come from its Classic nav deep links, which AlertZero only
 * lists while its setting, space, license and privileges allow it, ordered by their `order`.
 */
const useAlertZeroNavItems = (): SolutionSideNavItem[] => {
  const { application } = useKibana().services;
  const applications = useObservable(application.applications$);
  const deepLinks = applications?.get(ALERTZERO_APP_ID)?.deepLinks;

  return useMemo(
    () =>
      (deepLinks ?? [])
        .filter(({ visibleIn }) => visibleIn.includes('classicSideNav'))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(({ id, title }) => ({
          id: `${ALERTZERO_APP_ID}:${id}`,
          label: title,
          href: application.getUrlForApp(ALERTZERO_APP_ID, { deepLinkId: id }),
          position: SolutionSideNavItemPosition.top,
        })),
    [application, deepLinks]
  );
};

const useSolutionSideNavItems = (
  chatExperience: AIChatExperience,
  alertZeroItems: SolutionSideNavItem[],
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem<string>[] | undefined => {
  const navLinks = useNavLinks();
  const { application } = useKibana().services;

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

      if (
        navLink.id === SecurityPageName.launchpad ||
        navLink.id === SecurityPageName.administration
      ) {
        return navItems;
      }

      navItems.push(formatLink(navLink, getSecuritySolutionLinkProps));

      return navItems;
    }, []);

    // External app links — hrefs are built via getUrlForApp so basePath and active
    // space are automatically prepended (handles e.g. /s/my-space/app/discover).
    const externalLinks: SolutionSideNavItem[] = [
      ...alertZeroItems,
      // Agent builder for AI agent chat and not classic AI experience
      ...(chatExperience === AIChatExperience.Agent
        ? [
            {
              id: SecurityPageName.externalLinkAgentBuilder,
              label: 'Agents',
              href: application.getUrlForApp('agent_builder', { path: '/agents' }),
              onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                application.navigateToApp('agent_builder', { path: '/agents' });
              },
              position: SolutionSideNavItemPosition.top,
            },
          ]
        : []),
      {
        id: SecurityPageName.externalLinkDiscover,
        label: 'Discover',
        href: application.getUrlForApp('discover'),
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          application.navigateToApp('discover');
        },
        position: SolutionSideNavItemPosition.top,
      },
      {
        id: SecurityPageName.externalLinkWorkflows,
        label: 'Workflows',
        href: application.getUrlForApp('workflows'),
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          application.navigateToApp('workflows');
        },
        position: SolutionSideNavItemPosition.top,
      },
    ];

    return [...externalLinks, ...bodyItems, ...(classicFooterItems ? classicFooterItems : [])];
  }, [
    alertZeroItems,
    application,
    chatExperience,
    navLinks,
    getSecuritySolutionLinkProps,
    classicFooterItems,
  ]);

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

export interface SecuritySideNavContentProps {
  selectedId: string;
  panelBottomOffset?: string;
  enableAlertsAndAttacksAlignment: boolean;
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps;
}

/**
 * Security navigation without the Security app's router and store, so other apps can render it.
 * It takes the links to render from the generic application `links` configs.
 */
export const SecuritySideNavContent: React.FC<SecuritySideNavContentProps> = ({
  selectedId,
  panelBottomOffset,
  enableAlertsAndAttacksAlignment,
  getSecuritySolutionLinkProps,
}) => {
  const {
    settings: { client },
  } = useKibana().services;

  const chatExperience = useObservable(client.get$(AI_CHAT_EXPERIENCE_TYPE));
  const alertZeroItems = useAlertZeroNavItems();
  const items = useSolutionSideNavItems(
    chatExperience,
    alertZeroItems,
    getSecuritySolutionLinkProps
  );
  const panelTopOffset = usePanelTopOffset();

  const categories = useMemo(() => {
    return getNavCategories(
      chatExperience,
      enableAlertsAndAttacksAlignment,
      alertZeroItems.map(({ id }) => id)
    );
  }, [alertZeroItems, enableAlertsAndAttacksAlignment, chatExperience]);

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

/**
 * Main security navigation component, for the Security app's pages.
 */
export const SecuritySideNav: React.FC = () => {
  const enableAlertsAndAttacksAlignment = useIsExperimentalFeatureEnabled(
    'enableAlertsAndAttacksAlignment'
  );
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props
  const selectedId = useSelectedId();
  const panelBottomOffset = usePanelBottomOffset();

  return (
    <SecuritySideNavContent
      selectedId={selectedId}
      panelBottomOffset={panelBottomOffset}
      enableAlertsAndAttacksAlignment={enableAlertsAndAttacksAlignment}
      getSecuritySolutionLinkProps={getSecuritySolutionLinkProps}
    />
  );
};
