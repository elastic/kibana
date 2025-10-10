/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';
import { v2FooterItems } from './v2_footer_items';

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
          link: securityLink(SecurityPageName.landing),
          title: SOLUTION_NAME,
          icon: 'logoSecurity',
          renderAs: 'home',
          sideNavVersion: 'v2',
        },
        {
          link: 'discover',
          iconV2: 'discoverApp',
          sideNavVersion: 'v1',
        },
        defaultNavigationTree.dashboards({ sideNavVersion: 'v1' }),
        {
          breadcrumbStatus: 'hidden',
          children: [
            defaultNavigationTree.rules({ sideNavVersion: 'v1' }),
            {
              id: SecurityPageName.alerts,
              link: securityLink(SecurityPageName.alerts),
              sideNavVersion: 'v1',
            },
            {
              link: 'workflows',
              withBadge: true,
              badgeTypeV2: 'techPreview' as const,
              badgeOptions: {
                icon: 'beaker',
                tooltip: i18nStrings.workflows.badgeTooltip,
              },
              sideNavVersion: 'v1',
            },
            {
              id: SecurityPageName.attackDiscovery,
              link: securityLink(SecurityPageName.attackDiscovery),
              sideNavVersion: 'v1',
            },
            {
              id: SecurityPageName.cloudSecurityPostureFindings,
              link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
              sideNavVersion: 'v1',
            },
            defaultNavigationTree.cases({ sideNavVersion: 'v1' }),
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            defaultNavigationTree.entityAnalytics({ sideNavVersion: 'v1' }),
            defaultNavigationTree.explore({ sideNavVersion: 'v1' }),
            defaultNavigationTree.investigations({ sideNavVersion: 'v1' }),
            {
              id: SecurityPageName.threatIntelligence,
              link: securityLink(SecurityPageName.threatIntelligence),
              sideNavVersion: 'v1',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityPageName.assetInventory,
              link: securityLink(SecurityPageName.assetInventory),
              sideNavVersion: 'v1',
            },
            {
              id: SecurityPageName.siemReadiness,
              link: securityLink(SecurityPageName.siemReadiness),
              sideNavVersion: 'v1',
            },
            defaultNavigationTree.assets(services, { sideNavVersion: 'v1' }),
          ],
        },
        defaultNavigationTree.ml({ sideNavVersion: 'v1' }),
        // version 2 sidenav
        ...defaultNavigationTree.v2(services),
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
          sideNavVersion: 'v1',
          icon: 'launch',
        },
        // version 2 sidenav launchpad
        {
          id: 'launchpad',
          title: i18nStrings.launchPad.title,
          renderAs: 'panelOpener',
          sideNavVersion: 'v2',
          iconV2: 'launch',
          children: [
            {
              children: [
                {
                  id: 'launchpad_get_started',
                  link: securityLink(SecurityPageName.landing),
                  sideNavVersion: 'v2',
                },
                {
                  link: securityLink(SecurityPageName.siemReadiness),
                  sideNavVersion: 'v2',
                },
                {
                  // value report
                  link: securityLink(SecurityPageName.aiValue),
                  sideNavVersion: 'v2',
                },
              ],
            },
            {
              title: i18nStrings.launchPad.migrations.title,
              children: [
                {
                  id: SecurityPageName.siemMigrationsRules,
                  link: securityLink(SecurityPageName.siemMigrationsRules),
                  sideNavVersion: 'v2',
                },
                {
                  id: SecurityPageName.siemMigrationsDashboards,
                  link: securityLink(SecurityPageName.siemMigrationsDashboards),
                  sideNavVersion: 'v2',
                },
              ],
            },
          ],
        },
        {
          link: 'dev_tools',
          title: i18nStrings.devTools,
          icon: 'editorCodeBlock',
        },
        // version 2 sidenav footer items
        ...v2FooterItems,
        {
          title: i18nStrings.management.title,
          icon: 'gear',
          breadcrumbStatus: 'hidden',
          renderAs: 'accordion',
          spaceBefore: null,
          sideNavVersion: 'v1',
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
              sideNavVersion: 'v1',
            },
            {
              link: 'integrations',
              sideNavVersion: 'v1',
            },
          ],
        },
      ],
    },
  ],
});
