/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18nStrings } from '@kbn/security-solution-navigation/links';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';

export const v2EaseFooterItems: NodeDefinition<AppDeepLinkId, string, string>[] = [
  {
    title: i18nStrings.ingestAndManageData.title,
    iconV2: 'database',
    breadcrumbStatus: 'hidden',
    renderAs: 'panelOpener',
    spaceBefore: null,
    sideNavVersion: 'v2',
    children: [
      {
        title: i18nStrings.ingestAndManageData.ingestAndIntegrations.title,
        children: [
          // TODO: same as Congigurations/Integrations on the main nav list
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
    iconV2: 'gear',
    breadcrumbStatus: 'hidden',
    renderAs: 'panelOpener',
    spaceBefore: null,
    sideNavVersion: 'v2',
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
];
