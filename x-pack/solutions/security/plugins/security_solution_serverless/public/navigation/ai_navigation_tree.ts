/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { AiNavigationIcon } from './ai_navigation_icon';
import { createMachineLearningNavigationTree } from './ml_navigation';
import { createStackManagementNavigationTree } from './stack_management_navigation';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.aiNavigation.projectType.title',
  { defaultMessage: 'AI for SOC' }
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
          link: 'discover',
        },
        {
          id: SecurityPageName.attackDiscovery,
          link: securityLink(SecurityPageName.attackDiscovery),
        },
        {
          id: SecurityPageName.case,
          link: securityLink(SecurityPageName.case),
          renderAs: 'item',
          children: [
            {
              id: SecurityPageName.caseCreate,
              link: securityLink(SecurityPageName.caseCreate),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.caseConfigure,
              link: securityLink(SecurityPageName.caseConfigure),
              sideNavStatus: 'hidden',
            },
          ],
        },
        createMachineLearningNavigationTree(),
        {
          id: SecurityPageName.alertSummary,
          link: securityLink(SecurityPageName.alertSummary),
        },
        {
          id: SecurityPageName.configurations,
          link: securityLink(SecurityPageName.configurations),
          renderAs: 'panelOpener',
          children: [
            {
              id: SecurityPageName.configurationsAiSettings,
              link: securityLink(SecurityPageName.configurationsAiSettings),
            },
            {
              id: SecurityPageName.configurationsBasicRules,
              link: securityLink(SecurityPageName.configurationsBasicRules),
            },
            {
              id: SecurityPageName.configurationsIntegrations,
              link: securityLink(SecurityPageName.configurationsIntegrations),
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      icon: 'launch',
    },
    {
      type: 'navItem',
      link: 'dev_tools',
      title: i18nStrings.devTools,
      icon: 'editorCodeBlock',
    },
    createStackManagementNavigationTree(),
  ],
});
