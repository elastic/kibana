/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import {
  ATTACKS_ALERTS_ALIGNMENT_ENABLED,
  SecurityGroupName,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import {
  SecurityLinkGroup,
  i18nStrings,
  securityLink,
} from '@kbn/security-solution-navigation/links';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';

import { type Services } from '../common/services';
import { createStackManagementNavigationTree } from './stack_management_navigation';
import { createV2footerItemsTree } from './v2_footer_items';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createNavigationTree = async (
  services: Services
): Promise<NavigationTreeDefinition> => {
  return {
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_nav',
        title: SOLUTION_NAME,
        icon: 'logoSecurity',
        breadcrumbStatus: 'hidden',
        isCollapsible: false,
        defaultIsCollapsed: false,
        children: [
          {
            link: securityLink(SecurityPageName.landing),
            title: SOLUTION_NAME,
            icon: 'logoSecurity',
            renderAs: 'home',
            sideNavVersion: 'v2',
          },
          {
            link: 'discover',
            sideNavVersion: 'v1',
          },
          defaultNavigationTree.dashboards({ sideNavVersion: 'v1' }),
          {
            breadcrumbStatus: 'hidden',
            children: [
              defaultNavigationTree.rules({ sideNavVersion: 'v1' }),
              services.featureFlags.getBooleanValue(ATTACKS_ALERTS_ALIGNMENT_ENABLED, false)
                ? defaultNavigationTree.alertDetections({ sideNavVersion: 'v1' })
                : {
                    id: SecurityPageName.alerts,
                    link: securityLink(SecurityPageName.alerts),
                    sideNavVersion: 'v1',
                  },
              {
                link: 'workflows',
                withBadge: true,
                badgeTypeV2: 'techPreview' as const,
                badgeOptions: {
                  icon: 'beaker',
                  tooltip: i18nStrings.workflows.badgeTooltip,
                },
                sideNavVersion: 'v1',
              },
              {
                id: SecurityPageName.attackDiscovery,
                link: securityLink(SecurityPageName.attackDiscovery),
                sideNavVersion: 'v1',
              },
              {
                id: SecurityPageName.cloudSecurityPostureFindings,
                link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
                sideNavVersion: 'v1',
              },
              defaultNavigationTree.cases({ sideNavVersion: 'v1' }),
            ],
          },
          {
            breadcrumbStatus: 'hidden',
            children: [
              defaultNavigationTree.entityAnalytics({ sideNavVersion: 'v1' }),
              defaultNavigationTree.explore({ sideNavVersion: 'v1' }),
              defaultNavigationTree.investigations({ sideNavVersion: 'v1' }),
              {
                id: SecurityPageName.threatIntelligence,
                link: securityLink(SecurityPageName.threatIntelligence),
                sideNavVersion: 'v1',
              },
            ],
          },
          {
            breadcrumbStatus: 'hidden',
            children: [
              {
                id: SecurityPageName.assetInventory,
                link: securityLink(SecurityPageName.assetInventory),
                sideNavVersion: 'v1',
              },
              defaultNavigationTree.assets(services, { sideNavVersion: 'v1' }),
              {
                id: SecurityPageName.siemReadiness,
                link: securityLink(SecurityPageName.siemReadiness),
                sideNavVersion: 'v1',
              },
            ],
          },
          defaultNavigationTree.ml({ sideNavVersion: 'v1' }),
          // version 2 sidenav
          ...defaultNavigationTree.v2(services),
        ],
      },
    ],
    footer: [
      {
        id: 'security_solution_nav_footer',
        type: 'navGroup',
        children: [
          {
            id: SecurityGroupName.launchpad,
            title: SecurityLinkGroup[SecurityGroupName.launchpad].title,
            renderAs: 'panelOpener',
            sideNavVersion: 'v1',
            iconV2: 'launch',
            children: [
              {
                children: [
                  {
                    id: SecurityPageName.landing,
                    link: securityLink(SecurityPageName.landing),
                    sideNavVersion: 'v1',
                  },
                  {
                    // value report
                    id: SecurityPageName.aiValue,
                    link: securityLink(SecurityPageName.aiValue),
                    sideNavVersion: 'v1',
                  },
                ],
              },
            ],
          },
          {
            id: SecurityGroupName.launchpad,
            title: i18nStrings.launchPad.title,
            renderAs: 'panelOpener',
            sideNavVersion: 'v2',
            iconV2: 'launch',
            children: [
              {
                children: [
                  {
                    id: SecurityPageName.landing,
                    link: securityLink(SecurityPageName.landing),
                    sideNavVersion: 'v2',
                  },
                  {
                    id: SecurityPageName.siemReadiness,
                    link: securityLink(SecurityPageName.siemReadiness),
                    sideNavVersion: 'v2',
                  },
                  {
                    // value report
                    id: SecurityPageName.aiValue,
                    link: securityLink(SecurityPageName.aiValue),
                    sideNavVersion: 'v2',
                  },
                ],
              },
              {
                title: i18nStrings.launchPad.migrations.title,
                children: [
                  {
                    id: SecurityPageName.siemMigrationsRules,
                    link: securityLink(SecurityPageName.siemMigrationsRules),
                    sideNavVersion: 'v2',
                  },
                  {
                    id: SecurityPageName.siemMigrationsDashboards,
                    link: securityLink(SecurityPageName.siemMigrationsDashboards),
                    sideNavVersion: 'v2',
                  },
                ],
              },
            ],
          },
          {
            link: 'dev_tools',
            title: i18nStrings.devTools,
            icon: 'editorCodeBlock',
          },
          createStackManagementNavigationTree({ sideNavVersion: 'v1' }),
          createV2footerItemsTree(),
        ],
      },
    ],
  };
};
