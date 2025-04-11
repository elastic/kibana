/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { SecurityGroupName, SecurityPageName } from '@kbn/security-solution-navigation';
import {
  securityLink,
  i18nStrings,
  renderIntegrationsLinkCallout,
  SecurityLinkGroup,
} from '@kbn/security-solution-navigation/links';
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
      children: [
        { link: 'discover' },
        {
          id: SecurityPageName.dashboards,
          link: securityLink(SecurityPageName.dashboards),
          renderAs: 'item',
          children: [
            {
              id: SecurityPageName.overview,
              link: securityLink(SecurityPageName.overview),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.detectionAndResponse,
              link: securityLink(SecurityPageName.detectionAndResponse),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.cloudSecurityPostureDashboard,
              link: securityLink(SecurityPageName.cloudSecurityPostureDashboard),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.cloudSecurityPostureVulnerabilityDashboard,
              link: securityLink(SecurityPageName.cloudSecurityPostureVulnerabilityDashboard),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.entityAnalytics,
              link: securityLink(SecurityPageName.entityAnalytics),
              sideNavStatus: 'hidden',
            },
            {
              id: SecurityPageName.dataQuality,
              link: securityLink(SecurityPageName.dataQuality),
              sideNavStatus: 'hidden',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityGroupName.rules,
              title: SecurityLinkGroup[SecurityGroupName.rules].title,
              children: [
                {
                  title: i18nStrings.rules.management.title,
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: SecurityPageName.rules,
                      link: securityLink(SecurityPageName.rules),
                      renderAs: 'item',
                      children: [
                        {
                          id: SecurityPageName.rulesAdd,
                          link: securityLink(SecurityPageName.rulesAdd),
                        },
                        {
                          id: SecurityPageName.rulesCreate,
                          link: securityLink(SecurityPageName.rulesCreate),
                        },
                      ],
                    },
                    {
                      id: SecurityPageName.cloudSecurityPostureBenchmarks,
                      link: securityLink(SecurityPageName.cloudSecurityPostureBenchmarks),
                    },
                    {
                      id: SecurityPageName.exceptions,
                      link: securityLink(SecurityPageName.exceptions),
                    },
                    {
                      id: SecurityPageName.siemMigrationsRules,
                      link: securityLink(SecurityPageName.siemMigrationsRules),
                    },
                  ],
                },
                {
                  title: i18nStrings.rules.management.discover,
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      id: SecurityPageName.coverageOverview,
                      link: securityLink(SecurityPageName.coverageOverview),
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
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
            {
              id: SecurityPageName.case,
              link: securityLink(SecurityPageName.case),
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
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityGroupName.investigations,
              title: SecurityLinkGroup[SecurityGroupName.investigations].title,
              children: [
                {
                  id: SecurityPageName.timelines,
                  link: securityLink(SecurityPageName.timelines),
                  renderAs: 'item',
                  children: [
                    {
                      id: SecurityPageName.timelinesTemplates,
                      link: securityLink(SecurityPageName.timelinesTemplates),
                      sideNavStatus: 'hidden',
                    },
                  ],
                },
                {
                  id: SecurityPageName.notes,
                  link: securityLink(SecurityPageName.notes),
                  renderAs: 'item',
                },
                {
                  link: 'osquery',
                  renderAs: 'item',
                },
              ],
              renderAs: 'panelOpener',
            },
            {
              id: SecurityPageName.threatIntelligence,
              link: securityLink(SecurityPageName.threatIntelligence),
            },
            {
              id: SecurityGroupName.explore,
              title: SecurityLinkGroup[SecurityGroupName.explore].title,
              children: [
                {
                  id: SecurityPageName.hosts,
                  link: securityLink(SecurityPageName.hosts),
                  renderAs: 'item',
                  children: [
                    {
                      id: SecurityPageName.hostsAll,
                      link: securityLink(SecurityPageName.hostsAll),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.hostsUncommonProcesses,
                      link: securityLink(SecurityPageName.hostsUncommonProcesses),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.hostsAnomalies,
                      link: securityLink(SecurityPageName.hostsAnomalies),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.hostsEvents,
                      link: securityLink(SecurityPageName.hostsEvents),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.hostsRisk,
                      link: securityLink(SecurityPageName.hostsRisk),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.hostsSessions,
                      link: securityLink(SecurityPageName.hostsSessions),
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                {
                  id: SecurityPageName.network,
                  link: securityLink(SecurityPageName.network),
                  renderAs: 'item',
                  children: [
                    {
                      id: SecurityPageName.networkFlows,
                      link: securityLink(SecurityPageName.networkFlows),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.networkDns,
                      link: securityLink(SecurityPageName.networkDns),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.networkHttp,
                      link: securityLink(SecurityPageName.networkHttp),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.networkTls,
                      link: securityLink(SecurityPageName.networkTls),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.networkAnomalies,
                      link: securityLink(SecurityPageName.networkAnomalies),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.networkEvents,
                      link: securityLink(SecurityPageName.networkEvents),
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                {
                  id: SecurityPageName.users,
                  link: securityLink(SecurityPageName.users),
                  renderAs: 'item',
                  children: [
                    {
                      id: SecurityPageName.usersAll,
                      link: securityLink(SecurityPageName.usersAll),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.usersAuthentications,
                      link: securityLink(SecurityPageName.usersAuthentications),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.usersAnomalies,
                      link: securityLink(SecurityPageName.usersAnomalies),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.usersRisk,
                      link: securityLink(SecurityPageName.usersRisk),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.usersEvents,
                      link: securityLink(SecurityPageName.usersEvents),
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityGroupName.assets,
              title: SecurityLinkGroup[SecurityGroupName.assets].title,
              children: [
                {
                  link: 'fleet',
                  title: i18nStrings.assets.fleet.title,
                  children: [
                    {
                      link: 'fleet:agents',
                    },
                    {
                      link: 'fleet:policies',
                      title: i18nStrings.assets.fleet.policies,
                    },
                    {
                      link: 'fleet:enrollment_tokens',
                    },
                    {
                      link: 'fleet:uninstall_tokens',
                    },
                    {
                      link: 'fleet:data_streams',
                    },
                    {
                      link: 'fleet:settings',
                    },
                  ],
                },
                {
                  id: SecurityPageName.endpoints,
                  link: securityLink(SecurityPageName.endpoints),
                  title: i18nStrings.assets.endpoints.title,
                  children: [
                    {
                      id: SecurityPageName.endpoints,
                      link: securityLink(SecurityPageName.endpoints),
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      id: SecurityPageName.policies,
                      link: securityLink(SecurityPageName.policies),
                    },
                    {
                      id: SecurityPageName.trustedApps,
                      link: securityLink(SecurityPageName.trustedApps),
                    },
                    {
                      id: SecurityPageName.eventFilters,
                      link: securityLink(SecurityPageName.eventFilters),
                    },
                    {
                      id: SecurityPageName.hostIsolationExceptions,
                      link: securityLink(SecurityPageName.hostIsolationExceptions),
                    },
                    {
                      id: SecurityPageName.blocklist,
                      link: securityLink(SecurityPageName.blocklist),
                    },
                    {
                      id: SecurityPageName.responseActionsHistory,
                      link: securityLink(SecurityPageName.responseActionsHistory),
                    },
                  ],
                },
                {
                  title: '',
                  renderItem: () => renderIntegrationsLinkCallout(services),
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
        {
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: SecurityGroupName.machineLearning,
              title: SecurityLinkGroup[SecurityGroupName.machineLearning].title,
              children: [
                {
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      link: 'ml:overview',
                      title: i18nStrings.ml.overview,
                    },
                    {
                      link: 'ml:dataVisualizer',
                      title: i18nStrings.ml.dataVisualizer,
                    },
                  ],
                },
                {
                  title: i18nStrings.ml.anomalyDetection.title,
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      link: 'ml:anomalyExplorer',
                      title: i18nStrings.ml.anomalyDetection.anomalyExplorer,
                    },
                    {
                      link: 'ml:singleMetricViewer',
                      title: i18nStrings.ml.anomalyDetection.singleMetricViewer,
                    },
                  ],
                },
                {
                  title: i18nStrings.ml.dataFrameAnalytics.title,
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      link: 'ml:resultExplorer',
                      title: i18nStrings.ml.dataFrameAnalytics.resultExplorer,
                    },
                    {
                      link: 'ml:analyticsMap',
                      title: i18nStrings.ml.dataFrameAnalytics.analyticsMap,
                    },
                  ],
                },
                {
                  title: i18nStrings.ml.aiopsLabs.title,
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      link: 'ml:logRateAnalysis',
                      title: i18nStrings.ml.aiopsLabs.logRateAnalysis,
                    },
                    {
                      link: 'ml:logPatternAnalysis',
                      title: i18nStrings.ml.aiopsLabs.logPatternAnalysis,
                    },
                    {
                      link: 'ml:changePointDetections',
                      title: i18nStrings.ml.aiopsLabs.changePointDetection,
                    },
                  ],
                },
              ],
              renderAs: 'panelOpener',
            },
          ],
        },
      ],
      isCollapsible: false,
    },
  ],
  footer: [
    {
      id: SecurityPageName.landing,
      link: securityLink(SecurityPageName.landing),
      type: 'navItem',
      icon: 'launch',
    },
    {
      type: 'navItem',
      link: 'dev_tools',
      title: i18nStrings.devTools,
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      title: i18nStrings.management.title,
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18nStrings.stackManagement.title,
          renderAs: 'panelOpener',
          spaceBefore: null,
          children: [
            {
              title: i18nStrings.stackManagement.ingest.title,
              children: [
                {
                  link: 'management:ingest_pipelines',
                },
                {
                  link: 'management:pipelines',
                },
              ],
            },
            {
              title: i18nStrings.stackManagement.data.title,
              children: [
                {
                  link: 'management:index_management',
                },
                {
                  link: 'management:index_lifecycle_management',
                },
                {
                  link: 'management:snapshot_restore',
                },
                {
                  link: 'management:rollup_jobs',
                },
                {
                  link: 'management:transform',
                },
                {
                  link: 'management:cross_cluster_replication',
                },
                {
                  link: 'management:remote_clusters',
                },
                {
                  link: 'management:migrate_data',
                },
              ],
            },
            {
              title: i18nStrings.stackManagement.alertsAndInsights.title,
              children: [
                {
                  link: 'management:triggersActions',
                },
                {
                  link: 'management:cases',
                },
                {
                  link: 'management:triggersActionsConnectors',
                },
                {
                  link: 'management:reporting',
                },
                {
                  link: 'management:jobsListLink',
                },
                {
                  link: 'management:watcher',
                },
                {
                  link: 'management:maintenanceWindows',
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
              title: i18nStrings.stackManagement.security.title,
              children: [
                {
                  link: 'management:users',
                },
                {
                  link: 'management:roles',
                },
                {
                  link: 'management:api_keys',
                },
                {
                  link: 'management:role_mappings',
                },
              ],
            },
            {
              title: i18nStrings.stackManagement.kibana.title,
              children: [
                {
                  link: 'management:dataViews',
                },
                {
                  link: 'management:filesManagement',
                },
                {
                  link: 'management:objects',
                },
                {
                  link: 'management:tags',
                },
                {
                  link: 'management:search_sessions',
                },
                {
                  link: 'management:aiAssistantManagementSelection',
                },
                {
                  link: 'management:spaces',
                },
                {
                  link: 'maps',
                },
                {
                  link: 'visualize',
                },
                {
                  link: 'graph',
                },
                {
                  link: 'canvas',
                },
                {
                  link: 'management:settings',
                },
              ],
            },
            {
              title: i18nStrings.stackManagement.stack.title,
              children: [
                {
                  link: 'management:license_management',
                },
                {
                  link: 'management:upgrade_assistant',
                },
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
});
