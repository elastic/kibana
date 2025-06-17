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

import { type Services } from '../common/services';
import { createStackManagementNavigationTree } from './stack_management_navigation';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createNavigationTree = (services: Services): NavigationTreeDefinition => ({
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
          link: 'discover',
        },
        defaultNavigationTree.dashboards(),
        {
          breadcrumbStatus: 'hidden',
          children: [
            defaultNavigationTree.rules(),
            {
              id: SecurityPageName.alerts,
              link: securityLink(SecurityPageName.alerts),
            },
            {
              id: SecurityPageName.attackDiscovery,
              link: securityLink(SecurityPageName.attackDiscovery),
            },
            {
              id: SecurityPageName.cloudSecurityPostureFindings,
              link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
            },
            defaultNavigationTree.cases(),
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            defaultNavigationTree.investigations(),
            {
              id: SecurityPageName.threatIntelligence,
              link: securityLink(SecurityPageName.threatIntelligence),
            },
            defaultNavigationTree.explore(),
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityPageName.assetInventory,
              link: securityLink(SecurityPageName.assetInventory),
            },
            defaultNavigationTree.assets(services),
            defaultNavigationTree.entityAnalytics(),
          ],
        },
        defaultNavigationTree.ml(),
      ],
    },
  ],
  footer: [
    {
      id: 'security_solution_nav_footer',
      type: 'navGroup',
      children: [
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
        createStackManagementNavigationTree(),
      ],
    },
  ],
});
