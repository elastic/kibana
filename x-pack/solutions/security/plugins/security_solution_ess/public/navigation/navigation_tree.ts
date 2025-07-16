/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { securityLink, i18nStrings } from '@kbn/security-solution-navigation/links';
import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';

export const createNavigationTree = (services: Services): NavigationTreeDefinition => ({
  body: [
    {
      type: 'navGroup',
      id: 'security_solution_nav',
      title: SOLUTION_NAME,
      icon: 'logoSecurity',
      breadcrumbStatus: 'hidden',
      defaultIsCollapsed: false,
      isCollapsible: false,
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
        {
          title: i18nStrings.management.title,
          icon: 'gear',
          breadcrumbStatus: 'hidden',
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              id: 'stack_management',
              title: i18nStrings.stackManagement.title,
              renderAs: 'panelOpener',
              spaceBefore: null,
              children: [
                {
                  title: i18nStrings.stackManagement.ingest.title,
                  children: [
                    { link: 'management:ingest_pipelines' },
                    { link: 'management:pipelines' },
                  ],
                },
                {
                  title: i18nStrings.stackManagement.data.title,
                  children: [
                    { link: 'management:index_management' },
                    { link: 'management:index_lifecycle_management' },
                    { link: 'management:snapshot_restore' },
                    { link: 'management:rollup_jobs' },
                    { link: 'management:transform' },
                    { link: 'management:cross_cluster_replication' },
                    { link: 'management:remote_clusters' },
                    { link: 'management:migrate_data' },
                    { link: 'management:content_connectors' },
                  ],
                },
                {
                  title: i18nStrings.stackManagement.alertsAndInsights.title,
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
                  title: i18nStrings.stackManagement.security.title,
                  children: [
                    { link: 'management:users' },
                    { link: 'management:roles' },
                    { link: 'management:api_keys' },
                    { link: 'management:role_mappings' },
                  ],
                },
                {
                  title: i18nStrings.stackManagement.kibana.title,
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
                  title: 'AI',
                  children: [
                    { link: 'management:genAiSettings' },
                    { link: 'management:aiAssistantManagementSelection' },
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
            {
              link: 'monitoring',
            },
            {
              link: 'integrations',
            },
          ],
        },
      ],
    },
  ],
});
