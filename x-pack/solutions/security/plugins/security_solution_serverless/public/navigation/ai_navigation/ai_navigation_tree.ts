/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition, AppDeepLinkId } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { AI_FOR_SOC_APP_ID, SecurityPageNameAiSoc } from '@kbn/deeplinks-security';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { AiNavigationIcon } from './icon';
import { createStackManagementNavigationTree } from '../stack_management_navigation';
import { renderAiSocCallout } from './callout';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.aiNavigation.projectType.title',
  { defaultMessage: 'AI for SOC' }
);

export const aiSocLink = (pageName: SecurityPageNameAiSoc): AppDeepLinkId => {
  return `${AI_FOR_SOC_APP_ID}:${pageName}`;
};

export const createAiNavigationTree = (): NavigationTreeDefinition => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_solution_ai_nav',
      title: SOLUTION_NAME,
      icon: AiNavigationIcon,
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      isCollapsible: false,
      children: [
        {
          id: SecurityPageName.alertSummary,
          link: securityLink(SecurityPageName.alertSummary),
        },
        {
          id: SecurityPageNameAiSoc.attackDiscovery,
          link: aiSocLink(SecurityPageNameAiSoc.attackDiscovery),
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityPageNameAiSoc.case,
              link: aiSocLink(SecurityPageNameAiSoc.case),
              children: [
                {
                  id: SecurityPageNameAiSoc.caseConfigure,
                  link: aiSocLink(SecurityPageNameAiSoc.caseConfigure),
                },
                {
                  id: SecurityPageNameAiSoc.caseCreate,
                  link: aiSocLink(SecurityPageNameAiSoc.caseCreate),
                },
              ],
            },
            /* {
              id: SecurityPageName.configurations,
              link: securityLink(SecurityPageName.configurations),
              renderAs: 'item',
              children: [
                {
                  id: SecurityPageName.configurationsIntegrations,
                  link: securityLink(SecurityPageName.configurationsIntegrations),
                },
                {
                  id: SecurityPageName.configurationsBasicRules,
                  link: securityLink(SecurityPageName.configurationsBasicRules),
                },
                {
                  id: SecurityPageName.configurationsAiSettings,
                  link: securityLink(SecurityPageName.configurationsAiSettings),
                },
              ],
            }, */
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'discover',
            },
          ],
        },
      ],
    },
  ],
  callout: [
    {
      type: 'navGroup',
      id: 'calloutGroup',
      defaultIsCollapsed: false,
      isCollapsible: false,
      children: [
        {
          renderItem: renderAiSocCallout,
        },
      ],
    },
  ],
  footer: [
    {
      id: 'security_solution_ai_nav_footer',
      type: 'navGroup',
      children: [
        {
          id: SecurityPageNameAiSoc.landing,
          link: securityLink(SecurityPageNameAiSoc.landing),
          icon: 'launch',
        },
        {
          link: 'dev_tools',
          title: i18nStrings.devTools,
          icon: 'editorCodeBlock',
        },
        createStackManagementNavigationTree(),
      ],
    },
  ],
});
