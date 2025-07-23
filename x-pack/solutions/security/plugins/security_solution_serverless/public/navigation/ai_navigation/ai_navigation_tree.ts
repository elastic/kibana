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

import { AiNavigationIcon } from './icon';
import { createStackManagementNavigationTree } from '../stack_management_navigation';

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
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityPageName.attackDiscovery,
              link: securityLink(SecurityPageName.attackDiscovery),
            },
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
