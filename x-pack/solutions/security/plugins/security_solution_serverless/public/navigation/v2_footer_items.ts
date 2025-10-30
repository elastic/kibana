/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';

export const createV2footerItemsTree = (): NodeDefinition => ({
  id: 'category-management',
  title: i18nStrings.projectSettings.title,
  icon: 'gear',
  breadcrumbStatus: 'hidden',
  renderAs: 'accordion',
  spaceBefore: null,
  sideNavVersion: 'v2',
  children: [
    {
      id: DATA_MANAGEMENT_NAV_ID,
      iconV2: 'database',
      title: i18nStrings.ingestAndManageData.title,
      renderAs: 'panelOpener',
      spaceBefore: null,
      children: [
        {
          title: i18nStrings.ingestAndManageData.ingestAndIntegrations.title,
          breadcrumbStatus: 'hidden',
          children: [
            // TODO: verify visibility; not visible on v1 serverless footer items
            {
              breadcrumbStatus: 'hidden',
              link: 'integrations',
            },
            {
              link: 'management:ingest_pipelines',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:pipelines',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:content_connectors',
              breadcrumbStatus: 'hidden',
            },
          ],
        },
        {
          title: i18nStrings.ingestAndManageData.indicesAndDataStreams.title,
          breadcrumbStatus: 'hidden',
          children: [
            { link: 'streams' },
            {
              breadcrumbStatus: 'hidden',
              link: 'management:index_management',
            },
            {
              breadcrumbStatus: 'hidden',
              link: 'management:transform',
            },
            {
              breadcrumbStatus: 'hidden',
              link: 'management:jobsListLink',
            },
            {
              breadcrumbStatus: 'hidden',
              link: 'management:data_quality',
            },
          ],
        },
      ],
    },
    {
      title: i18nStrings.stackManagementV2.serverlessTitle,
      id: STACK_MANAGEMENT_NAV_ID,
      iconV2: 'gear',
      breadcrumbStatus: 'hidden',
      renderAs: 'panelOpener',
      spaceBefore: null,
      sideNavVersion: 'v2',
      children: [
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
          ],
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
              id: SecurityPageName.entityAnalyticsManagement,
              link: securityLink(SecurityPageName.entityAnalyticsManagement),
            },
            {
              id: SecurityPageName.entityAnalyticsEntityStoreManagement,
              link: securityLink(SecurityPageName.entityAnalyticsEntityStoreManagement),
            },
          ],
        },
        {
          title: i18nStrings.ml.title,
          children: [
            { link: 'management:overview' },
            { link: 'management:anomaly_detection' },
            { link: 'management:analytics' },
            { link: 'management:trained_models' },
            { link: 'management:supplied_configurations' },
          ],
        },
        {
          title: i18nStrings.stackManagement.ai.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:genAiSettings',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'management:securityAiAssistantManagement',
              breadcrumbStatus: 'hidden',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.content.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              link: 'management:dataViews',
              breadcrumbStatus: 'hidden',
            },
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
            { link: 'maps' },
            { link: 'visualize' },
          ],
        },
        {
          title: i18nStrings.stackManagementV2.data.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              breadcrumbStatus: 'hidden',
              link: 'management:data_usage',
            },
          ],
        },
        {
          title: i18nStrings.stackManagement.other.title,
          breadcrumbStatus: 'hidden',
          children: [
            {
              breadcrumbStatus: 'hidden',
              link: 'management:settings',
            },
          ],
        },
        {
          // We include this link here to ensure that sidenav panel opens when user lands to legacy management landing page
          // https://github.com/elastic/kibana/issues/240275
          link: 'management',
          sideNavStatus: 'hidden',
        },
      ],
    },
  ],
});
