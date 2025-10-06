/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { AiNavigationIcon } from './icon';
import { createStackManagementNavigationTree } from '../stack_management_navigation';
import { renderAiSocCallout } from './callout';
import { v2EaseFooterItems } from './v2_ease_footer_items';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.aiNavigation.projectType.title',
  { defaultMessage: 'Elastic AI SOC Engine' }
);

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
          id: 'ease_home',
          link: securityLink(SecurityPageName.landing),
          title: SOLUTION_NAME,
          icon: AiNavigationIcon,
          renderAs: 'home',
          sideNavVersion: 'v2',
        },
        {
          id: SecurityPageName.alertSummary,
          link: securityLink(SecurityPageName.alertSummary),
          iconV2: 'warning',
        },
        {
          id: SecurityPageName.attackDiscovery,
          link: securityLink(SecurityPageName.attackDiscovery),
          iconV2: 'bolt',
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            defaultNavigationTree.cases({ sideNavVersion: 'v1' }),
            defaultNavigationTree.cases({ sideNavVersion: 'v2' }),
            {
              id: SecurityPageName.configurations,
              link: securityLink(SecurityPageName.configurations),
              renderAs: 'item',
              iconV2: 'controlsHorizontal',
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
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'discover',
            },
            {
              id: SecurityPageName.aiValue,
              link: securityLink(SecurityPageName.aiValue),
              iconV2: 'reporter',
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
          id: SecurityPageName.landing,
          link: securityLink(SecurityPageName.landing),
          icon: 'launch',
          iconV2: 'launch',
        },
        {
          link: 'dev_tools',
          title: i18nStrings.devTools,
          icon: 'editorCodeBlock',
          iconV2: 'editorCodeBlock',
        },
        ...v2EaseFooterItems,
        createStackManagementNavigationTree(),
      ],
    },
  ],
});
