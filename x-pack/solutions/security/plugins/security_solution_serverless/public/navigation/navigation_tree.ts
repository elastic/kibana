/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import {
  ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
  SecurityGroupName,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';

import { type Services } from '../common/services';
import { createManagementFooterItemsTree } from './management_footer_items';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createNavigationTree = async (
  services: Services,
  chatExperience: AIChatExperience = AIChatExperience.Classic
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
      icon: 'productDiscover',
    },
    defaultNavigationTree.dashboards(),
    defaultNavigationTree.rules(),
    services.uiSettings.get(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING, false)
      ? defaultNavigationTree.alertDetections()
      : {
          id: SecurityPageName.alerts,
          icon: 'warning',
          link: securityLink(SecurityPageName.alerts),
        },
    {
      link: 'workflows',
    },
    ...(chatExperience === AIChatExperience.Agent
      ? [
          {
            icon: 'productAgent',
            link: 'agent_builder' as AppDeepLinkId,
          },
        ]
      : []),
    {
      id: SecurityPageName.attackDiscovery,
      icon: 'bolt',
      link: securityLink(SecurityPageName.attackDiscovery),
    },
    {
      id: SecurityPageName.cloudSecurityPostureFindings,
      icon: 'bullseye',
      link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
    },
    defaultNavigationTree.cases(),
    defaultNavigationTree.entityAnalytics(),
    defaultNavigationTree.explore(),
    defaultNavigationTree.investigations(),
    {
      id: SecurityPageName.threatIntelligence,
      icon: 'processor',
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
    createManagementFooterItemsTree(chatExperience),
  ],
});
