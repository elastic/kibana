/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

export const createStackManagementNavigationTree = (): GroupDefinition => ({
  type: 'navGroup',
  id: 'category-management',
  title: i18nStrings.projectSettings.title,
  icon: 'gear',
  breadcrumbStatus: 'hidden',
  children: [
    {
      id: 'stack_management',
      title: i18nStrings.stackManagement.title,
      renderAs: 'panelOpener',
      spaceBefore: null,
      children: [
        {
          title: i18nStrings.stackManagement.data.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:index_management',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:transform',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:ingest_pipelines',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:dataViews',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:jobsListLink',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:pipelines',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:data_quality',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:data_usage',
              breadcrumbStatus: 'hidden',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.access.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:api_keys',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:roles',
              breadcrumbStatus: 'hidden',
            },
            {
              cloudLink: 'userAndRoles',
              title: i18nStrings.stackManagement.access.usersAndRoles,
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.alertsAndInsights.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:triggersActions',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:triggersActionsConnectors',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:maintenanceWindows',
              breadcrumbStatus: 'hidden',
            },
            {
              link: securityLink(SecurityPageName.entityAnalyticsManagement),
              breadcrumbStatus: 'hidden',
            },
            {
              link: securityLink(SecurityPageName.entityAnalyticsEntityStoreManagement),
              breadcrumbStatus: 'hidden',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.content.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:spaces',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:objects',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:filesManagement',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:reporting',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:tags',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'maps',
            },
            {
              link: 'visualize',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.other.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:settings',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:securityAiAssistantManagement',
              breadcrumbStatus: 'hidden',
            },
          ],
        },
      ],
    },
    {
      link: 'integrations',
    },
    {
      cloudLink: 'billingAndSub',
    },
  ],
});
