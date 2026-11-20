/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { SecurityGroupName, SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { getWorkflowsNavPanel } from '@kbn/deeplinks-workflows';

import { type Services } from '../common/services';
import { createManagementFooterItemsTree } from './management_footer_items';

export const createNavigationTree = async (
  services: Services,
  chatExperience: AIChatExperience = AIChatExperience.Classic,
  alertZeroEnabled: boolean = false
): Promise<NavigationTreeDefinition> => {
  const showAgentBuilder = chatExperience === AIChatExperience.Agent;
  const agentBuilderLink = {
    icon: 'productAgent',
    link: 'agent_builder' as AppDeepLinkId,
  };
  const contextEngineLink = {
    icon: 'tableSparkles',
    link: 'context_engine' as AppDeepLinkId,
  };

  return {
    body: [
      // With AlertZero off, keep the original order: Context Engine stays at the top without Agents, and
      // Agents and Context Engine follow Workflows. With AlertZero on, Agents sits between Escalations
      // and Watches, and Context Engine follows Workflows.
      ...(!alertZeroEnabled && !showAgentBuilder ? [contextEngineLink] : []),
      ...(alertZeroEnabled
        ? [
            ...defaultNavigationTree.alertZero(),
            ...(showAgentBuilder ? [agentBuilderLink] : []),
            ...defaultNavigationTree.alertZeroSecondary(),
          ]
        : []),
      {
        link: 'inbox' as AppDeepLinkId,
        icon: 'mail',
      },
      {
        link: 'discover',
        icon: 'productDiscover',
      },
      defaultNavigationTree.dashboards(),
      defaultNavigationTree.rules(),
      services.experimentalFeatures.enableAlertsAndAttacksAlignment
        ? defaultNavigationTree.alertDetections()
        : {
            id: SecurityPageName.alerts,
            icon: 'warning',
            link: securityLink(SecurityPageName.alerts),
          },
      ...getWorkflowsNavPanel(services),
      ...(!alertZeroEnabled && showAgentBuilder ? [agentBuilderLink] : []),
      ...(alertZeroEnabled || showAgentBuilder ? [contextEngineLink] : []),
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
        icon: 'listCheck',
        link: securityLink(SecurityPageName.assetInventory),
      },
      defaultNavigationTree.assets(services),
      defaultNavigationTree.ml(),
      {
        id: SecurityPageName.onboarding,
        link: 'onboarding' as AppDeepLinkId,
        sideNavStatus: 'hidden',
      },
    ],
    footer: [
      {
        id: SecurityGroupName.launchpad,
        title: i18nStrings.launchPad.title,
        renderAs: 'panelOpener',
        icon: 'rocket',
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
                badgeType: 'new',
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
                id: SecurityPageName.siemMigrationsManage,
                link: securityLink(SecurityPageName.siemMigrationsManage),
              },
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
        icon: 'code',
      },
      createManagementFooterItemsTree(chatExperience),
    ],
  };
};
