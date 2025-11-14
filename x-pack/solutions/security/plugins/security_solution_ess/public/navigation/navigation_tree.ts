/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import {
  ATTACKS_ALERTS_ALIGNMENT_ENABLED,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';
import { defaultNavigationTree } from '@kbn/security-solution-navigation/navigation_tree';
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { lazy } from 'react';
import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';

const LazyIconWorkflow = lazy(() =>
  import('./custom_icons/workflow').then(({ iconWorkflow }) => ({ default: iconWorkflow }))
);

// TODO delete when the `bullseye` EUI icon has been updated
const LazyIconFindings = lazy(() =>
  import('./custom_icons/findings').then(({ iconFindings }) => ({ default: iconFindings }))
);

// TODO delete when the EUI icon has been updated
const LazyIconIntelligence = lazy(() =>
  import('./custom_icons/intelligence').then(({ iconIntelligence }) => ({
    default: iconIntelligence,
  }))
);

export const createNavigationTree = (services: Services): NavigationTreeDefinition => ({
  body: [
    {
      id: 'security_solution_nav',
      icon: 'logoSecurity',
      link: securityLink(SecurityPageName.landing),
      title: SOLUTION_NAME,
      renderAs: 'home',
    },
    {
      link: 'discover',
      icon: 'discoverApp',
    },
    defaultNavigationTree.dashboards(),
    defaultNavigationTree.rules(),
    services.featureFlags.getBooleanValue(ATTACKS_ALERTS_ALIGNMENT_ENABLED, false)
      ? defaultNavigationTree.alertDetections()
      : {
          id: SecurityPageName.alerts,
          icon: 'warning',
          link: securityLink(SecurityPageName.alerts),
        },
    {
      // TODO: update icon from EUI
      icon: LazyIconWorkflow,
      link: 'workflows',
      badgeType: 'techPreview' as const,
    },
    {
      id: SecurityPageName.attackDiscovery,
      icon: 'bolt',
      link: securityLink(SecurityPageName.attackDiscovery),
    },
    {
      id: SecurityPageName.cloudSecurityPostureFindings,
      // TODO change this to the `bullseye` EUI icon when available
      icon: LazyIconFindings,
      link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
    },
    defaultNavigationTree.cases(),
    defaultNavigationTree.entityAnalytics(),
    defaultNavigationTree.explore(),
    defaultNavigationTree.investigations(),
    {
      id: SecurityPageName.threatIntelligence,
      // TODO change this to the `compute` EUI icon when available
      icon: LazyIconIntelligence,
      link: securityLink(SecurityPageName.threatIntelligence),
    },
    {
      id: SecurityPageName.assetInventory,
      icon: 'editorChecklist',
      link: securityLink(SecurityPageName.assetInventory),
    },
    defaultNavigationTree.assets(services),
    defaultNavigationTree.ml(),
  ],
  footer: [
    {
      id: 'security_solution_nav_footer',
      children: [
        {
          id: 'launchpad',
          title: i18nStrings.launchPad.title,
          renderAs: 'panelOpener',
          icon: 'launch',
          children: [
            {
              children: [
                {
                  id: 'launchpad_get_started',
                  link: securityLink(SecurityPageName.landing),
                },
                {
                  link: securityLink(SecurityPageName.siemReadiness),
                },
                {
                  // value report
                  link: securityLink(SecurityPageName.aiValue),
                },
              ],
            },
            {
              title: i18nStrings.launchPad.migrations.title,
              children: [
                {
                  id: SecurityPageName.siemMigrationsRules,
                  link: securityLink(SecurityPageName.siemMigrationsRules),
                },
                {
                  id: SecurityPageName.siemMigrationsDashboards,
                  link: securityLink(SecurityPageName.siemMigrationsDashboards),
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
        {
          id: DATA_MANAGEMENT_NAV_ID,
          title: i18nStrings.ingestAndManageData.title,
          icon: 'database',
          breadcrumbStatus: 'hidden',
          renderAs: 'panelOpener',
          children: [
            {
              title: i18nStrings.ingestAndManageData.ingestAndIntegrations.title,
              children: [
                { link: 'integrations' },
                // TODO: Add fleet back when it is possible to not jump to  fleet sub menu under assets
                // { link: 'fleet' },
                { link: 'management:ingest_pipelines' },
                // logstash pipeline
                { link: 'management:pipelines' },
                { link: 'management:content_connectors' },
              ],
            },
            {
              title: i18nStrings.ingestAndManageData.indicesAndDataStreams.title,
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
          icon: 'gear',
          breadcrumbStatus: 'hidden',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'stack_management_home',
              breadcrumbStatus: 'hidden',
              children: [
                {
                  // We include this link here to ensure that the settings icon does not land on Stack Monitoring by default
                  // https://github.com/elastic/kibana/issues/241518
                  // And that the sidenav panel opens when user lands to legacy management landing page
                  // https://github.com/elastic/kibana/issues/240275
                  link: 'management',
                  title: i18nStrings.stackManagementV2.home.title,
                  breadcrumbStatus: 'hidden',
                },
                { link: 'monitoring' },
              ],
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
      ],
    },
  ],
});
