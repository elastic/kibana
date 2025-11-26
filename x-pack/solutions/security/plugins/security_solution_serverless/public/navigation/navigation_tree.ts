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
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import {
  defaultNavigationTree,
  LazyIconFindings,
  LazyIconWorkflow,
  LazyIconIntelligence,
} from '@kbn/security-solution-navigation/navigation_tree';

import { type Services } from '../common/services';
import { createManagementFooterItemsTree } from './management_footer_items';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createNavigationTree = async (
  services: Services
): Promise<NavigationTreeDefinition> => ({
  body: [
    {
      id: 'security_solution_home',
      link: securityLink(SecurityPageName.landing),
      title: SOLUTION_NAME,
      icon: 'logoSecurity',
      renderAs: 'home',
    },
    {
      link: 'discover',
      icon: 'discoverApp',
    },
    defaultNavigationTree.dashboards(),
    defaultNavigationTree.rules(),
    services.featureFlags.getBooleanValue(ATTACKS_ALERTS_ALIGNMENT_ENABLED, false)
      ? defaultNavigationTree.alertDetections()
      : {
          id: SecurityPageName.alerts,
          icon: 'warning',
          link: securityLink(SecurityPageName.alerts),
        },
    {
      // TODO: update icon from EUI
      icon: LazyIconWorkflow,
      link: 'workflows',
      badgeType: 'techPreview' as const,
    },
    {
      id: SecurityPageName.attackDiscovery,
      icon: 'bolt',
      link: securityLink(SecurityPageName.attackDiscovery),
    },
    {
      id: SecurityPageName.cloudSecurityPostureFindings,
      // TODO change this to the `bullseye` EUI icon when available
      icon: LazyIconFindings,
      link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
    },
    defaultNavigationTree.cases(),
    defaultNavigationTree.entityAnalytics(),
    defaultNavigationTree.explore(),
    defaultNavigationTree.investigations(),
    {
      id: SecurityPageName.threatIntelligence,
      // TODO change this to the `compute` EUI icon when available
      icon: LazyIconIntelligence,
      link: securityLink(SecurityPageName.threatIntelligence),
    },
    {
      id: SecurityPageName.assetInventory,
      icon: 'editorChecklist',
      link: securityLink(SecurityPageName.assetInventory),
    },
    defaultNavigationTree.assets(services),
    defaultNavigationTree.ml(),
  ],
  footer: [
    {
      id: SecurityGroupName.launchpad,
      title: i18nStrings.launchPad.title,
      renderAs: 'panelOpener',
      icon: 'launch',
      children: [
        {
          children: [
            {
              id: SecurityPageName.landing,
              link: securityLink(SecurityPageName.landing),
            },
            {
              id: SecurityPageName.siemReadiness,
              link: securityLink(SecurityPageName.siemReadiness),
            },
            {
              // value report
              id: SecurityPageName.aiValue,
              link: securityLink(SecurityPageName.aiValue),
            },
          ],
        },
        {
          title: i18nStrings.launchPad.migrations.title,
          children: [
            {
              id: SecurityPageName.siemMigrationsRules,
              link: securityLink(SecurityPageName.siemMigrationsRules),
            },
            {
              id: SecurityPageName.siemMigrationsDashboards,
              link: securityLink(SecurityPageName.siemMigrationsDashboards),
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
    createManagementFooterItemsTree(),
  ],
});
