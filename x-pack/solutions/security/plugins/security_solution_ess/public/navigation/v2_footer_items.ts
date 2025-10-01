/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';

export const v2FooterItems: NodeDefinition<AppDeepLinkId, string, string>[] = [
  {
    id: DATA_MANAGEMENT_NAV_ID,
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
          { link: 'integrations', sideNavVersion: 'v2' },
          // TODO: Add fleet back when it is possible to not jump to  fleet sub menu under assets
          // { link: 'fleet' },
          { link: 'management:ingest_pipelines' },
          // logstash pipeline
          { link: 'management:pipelines' },
          { link: 'management:content_connectors' },
        ],
      },
      {
        title: i18nStrings.ingestAndManageData.indicesDsAndRollups.title,
        children: [
          { link: 'streams' },
          { link: 'management:index_management' },
          { link: 'management:index_lifecycle_management' },
          { link: 'management:snapshot_restore' },
          { link: 'management:transform' },
          { link: 'management:rollup_jobs' },
          { link: 'management:data_quality' },
        ],
      },
    ],
  },
  {
    id: STACK_MANAGEMENT_NAV_ID,
    title: i18nStrings.stackManagementV2.title,
    iconV2: 'gear',
    breadcrumbStatus: 'hidden',
    renderAs: 'panelOpener',
    spaceBefore: null,
    sideNavVersion: 'v2',
    children: [
      {
        breadcrumbStatus: 'hidden',
        children: [{ link: 'monitoring' }],
      },
      {
        title: i18nStrings.stackManagementV2.alertsAndInsights.title,
        children: [
          { link: 'management:triggersActions' },
          { link: 'management:cases' },
          { link: 'management:triggersActionsConnectors' },
          { link: 'management:reporting' },
          { link: 'management:jobsListLink' },
          { link: 'management:watcher' },
          { link: 'management:maintenanceWindows' },
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
        children: [
          { link: 'management:genAiSettings' },
          { link: 'management:aiAssistantManagementSelection' },
        ],
      },
      {
        title: i18nStrings.stackManagementV2.security.title,
        children: [
          { link: 'management:users' },
          { link: 'management:roles' },
          { link: 'management:api_keys' },
          { link: 'management:role_mappings' },
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
        title: i18nStrings.stackManagementV2.kibana.title,
        children: [
          { link: 'management:dataViews' },
          { link: 'management:filesManagement' },
          { link: 'management:objects' },
          { link: 'management:tags' },
          { link: 'management:search_sessions' },
          { link: 'management:spaces' },
          { link: 'maps' },
          { link: 'visualize' },
          { link: 'graph' },
          { link: 'canvas' },
          { link: 'management:settings' },
        ],
      },
      {
        title: i18nStrings.stackManagement.stack.title,
        children: [
          { link: 'management:license_management' },
          { link: 'management:upgrade_assistant' },
        ],
      },
    ],
  },
];
