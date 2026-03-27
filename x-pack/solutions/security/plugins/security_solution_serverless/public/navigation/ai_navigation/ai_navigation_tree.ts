/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { AIChatExperience } from '@kbn/ai-assistant-common';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { AiNavigationIcon } from './icon';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.aiNavigation.projectType.title',
  { defaultMessage: 'Elastic AI SOC Engine' }
);

export const createAiNavigationTree = (
  chatExperience: AIChatExperience = AIChatExperience.Classic,
  workflowsUiEnabled: boolean = false
): NavigationTreeDefinition => ({
  body: [
    {
      id: 'ease_home',
      link: securityLink(SecurityPageName.landing),
      title: SOLUTION_NAME,
      icon: AiNavigationIcon,
      renderAs: 'home',
    },
    {
      id: SecurityPageName.alertSummary,
      link: securityLink(SecurityPageName.alertSummary),
      icon: 'warning',
    },
    {
      id: SecurityPageName.attackDiscovery,
      link: securityLink(SecurityPageName.attackDiscovery),
      icon: 'bolt',
    },
    {
      breadcrumbStatus: 'hidden',
      children: [
        defaultNavigationTree.cases(),
        {
          id: SecurityPageName.configurations,
          link: securityLink(SecurityPageName.configurations),
          icon: 'controlsHorizontal',
          children: [
            {
              id: SecurityPageName.configurationsIntegrations,
              link: securityLink(SecurityPageName.configurationsIntegrations),
            },
            {
              id: SecurityPageName.configurationsBasicRules,
              link: securityLink(SecurityPageName.configurationsBasicRules),
            },
            ...(chatExperience !== AIChatExperience.Agent
              ? [
                  {
                    id: SecurityPageName.configurationsAiSettings,
                    link: securityLink(SecurityPageName.configurationsAiSettings),
                  },
                ]
              : []),
          ],
        },
      ],
    },
    {
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'discover' as AppDeepLinkId,
          icon: 'productDiscover',
        },
        ...(chatExperience === AIChatExperience.Agent
          ? [
              {
                icon: 'productAgent',
                link: 'agent_builder' as AppDeepLinkId,
              },
            ]
          : []),
        ...(workflowsUiEnabled
          ? [
              {
                link: 'workflows' as AppDeepLinkId,
              },
            ]
          : []),
        {
          id: SecurityPageName.aiValue,
          link: securityLink(SecurityPageName.aiValue),
          icon: 'reporter',
        },
      ],
    },
  ],
  footer: [
    {
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      icon: 'launch',
    },
    {
      link: 'dev_tools',
      title: i18nStrings.devTools,
      icon: 'editorCodeBlock',
    },
    {
      title: i18nStrings.ingestAndManageData.title,
      icon: 'database',
      breadcrumbStatus: 'hidden',
      renderAs: 'panelOpener',
      children: [
        {
          title: i18nStrings.ingestAndManageData.ingestAndIntegrations.title,
          children: [
            // TODO: same as Configurations/Integrations on the main nav list
            // sets to active when on integrations page
            // {
            //   id: `external-integrations`,
            //   link: securityLink(SecurityPageName.configurationsIntegrations),
            // },
            { link: 'management:ingest_pipelines' },
            { link: 'management:pipelines' },
            { link: 'management:content_connectors' },
          ],
        },
        {
          title: i18nStrings.ingestAndManageData.indicesAndDataStreams.title,
          children: [
            { link: 'management:index_management' },
            { link: 'management:transform' },
            { link: 'management:data_quality' },
          ],
        },
      ],
    },
    {
      title: i18nStrings.stackManagementV2.serverlessTitle,
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      renderAs: 'panelOpener',
      children: [
        {
          title: i18nStrings.stackManagementV2.access.title,
          children: [{ link: 'management:api_keys' }, { link: 'management:roles' }],
        },
        {
          title: i18nStrings.stackManagementV2.organization.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              cloudLink: 'billingAndSub',
            },
            {
              cloudLink: 'userAndRoles',
            },
          ],
        },
        {
          title: i18nStrings.stackManagementV2.alertsAndInsights.title,
          children: [
            { link: 'management:triggersActions' },
            { link: 'management:triggersActionsConnectors' },
          ],
        },
        {
          title: i18nStrings.ml.title,
          children: [
            {
              link: 'management:overview',
            },
            {
              link: 'management:trained_models',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.ai.title,
          breadcrumbStatus: 'hidden',
          children: [
            { link: 'management:genAiSettings' },
            { link: 'management:securityAiAssistantManagement' },
          ],
        },
        {
          title: i18nStrings.stackManagementV2.data.title,
          children: [
            { link: 'management:cross_cluster_replication' },
            { link: 'management:remote_clusters' },
            { link: 'management:migrate_data' },
          ],
        },
        {
          title: i18nStrings.stackManagement.content.title,
          children: [
            { link: 'management:dataViews' },
            { link: 'management:spaces' },
            { link: 'management:objects' },
            { link: 'management:filesManagement' },
            { link: 'management:reporting' },
            { link: 'management:tags' },
          ],
        },
        {
          title: i18nStrings.stackManagement.other.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:settings',
            },
          ],
        },
      ],
    },
  ],
});
