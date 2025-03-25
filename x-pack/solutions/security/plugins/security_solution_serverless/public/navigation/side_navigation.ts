/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { type Services } from '../common/services';

const PROJECT_TYPE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

const PROJECT_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectSettings.title',
  { defaultMessage: 'Project Settings' }
);

const createNavigationTree$ = (): Rx.Observable<NavigationTreeDefinition> => {
  return Rx.of({
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_nav',
        title: PROJECT_TYPE_TITLE,
        icon: 'logoSecurity',
        breadcrumbStatus: 'hidden',
        defaultIsCollapsed: false,
        children: [
          {
            breadcrumbStatus: 'hidden',
            children: [
              {
                id: 'discover:',
                link: 'discover',
              },
              {
                id: 'dashboards',
                link: 'securitySolutionUI:dashboards',
                renderAs: 'item',
                children: [
                  {
                    id: 'overview',
                    link: 'securitySolutionUI:overview',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'detection_response',
                    link: 'securitySolutionUI:detection_response',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cloud_security_posture-dashboard',
                    link: 'securitySolutionUI:cloud_security_posture-dashboard',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cloud_security_posture-vulnerability_dashboard',
                    link: 'securitySolutionUI:cloud_security_posture-vulnerability_dashboard',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'entity_analytics',
                    link: 'securitySolutionUI:entity_analytics',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'data_quality',
                    link: 'securitySolutionUI:data_quality',
                    sideNavStatus: 'hidden',
                  },
                ],
              },
            ],
          },
          {
            breadcrumbStatus: 'hidden',
            children: [
              {
                id: 'rules-landing',
                title: 'Rules',
                children: [
                  {
                    id: 'category-management',
                    title: 'Management',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'rules',
                        link: 'securitySolutionUI:rules',
                        renderAs: 'item',
                        children: [
                          {
                            id: 'rules-add',
                            link: 'securitySolutionUI:rules-add',
                          },
                          {
                            id: 'rules-create',
                            link: 'securitySolutionUI:rules-create',
                          },
                        ],
                      },
                      {
                        id: 'cloud_security_posture-benchmarks',
                        link: 'securitySolutionUI:cloud_security_posture-benchmarks',
                      },
                      {
                        id: 'exceptions',
                        link: 'securitySolutionUI:exceptions',
                      },
                      {
                        id: 'siem_migrations-rules',
                        link: 'securitySolutionUI:siem_migrations-rules',
                      },
                    ],
                  },
                  {
                    id: 'category-discover',
                    title: 'Discover',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'coverage-overview',
                        link: 'securitySolutionUI:coverage-overview',
                      },
                    ],
                  },
                ],
                renderAs: 'panelOpener',
              },
              {
                id: 'alerts',
                link: 'securitySolutionUI:alerts',
              },
              {
                id: 'attack_discovery',
                link: 'securitySolutionUI:attack_discovery',
              },
              {
                id: 'cloud_security_posture-findings',
                link: 'securitySolutionUI:cloud_security_posture-findings',
              },
              {
                id: 'cases',
                link: 'securitySolutionUI:cases',
                children: [
                  {
                    id: 'cases_create',
                    link: 'securitySolutionUI:cases_create',
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cases_configure',
                    link: 'securitySolutionUI:cases_configure',
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
                id: 'investigations',
                title: 'Investigations',
                children: [
                  {
                    id: 'timelines',
                    link: 'securitySolutionUI:timelines',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'timelines-templates',
                        link: 'securitySolutionUI:timelines-templates',
                        sideNavStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'notes',
                    link: 'securitySolutionUI:notes',
                    renderAs: 'item',
                  },
                  {
                    id: 'osquery:',
                    link: 'osquery',
                    renderAs: 'item',
                  },
                ],
                renderAs: 'panelOpener',
              },
              {
                id: 'threat_intelligence',
                link: 'securitySolutionUI:threat_intelligence',
              },
              {
                id: 'explore',
                title: 'Explore',
                children: [
                  {
                    id: 'hosts',
                    link: 'securitySolutionUI:hosts',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'hosts-all',
                        link: 'securitySolutionUI:hosts-all',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-uncommon_processes',
                        link: 'securitySolutionUI:hosts-uncommon_processes',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-anomalies',
                        link: 'securitySolutionUI:hosts-anomalies',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-events',
                        link: 'securitySolutionUI:hosts-events',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-risk',
                        link: 'securitySolutionUI:hosts-risk',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-sessions',
                        link: 'securitySolutionUI:hosts-sessions',
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'network',
                    link: 'securitySolutionUI:network',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'network-flows',
                        link: 'securitySolutionUI:network-flows',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-dns',
                        link: 'securitySolutionUI:network-dns',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-http',
                        link: 'securitySolutionUI:network-http',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-tls',
                        link: 'securitySolutionUI:network-tls',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-anomalies',
                        link: 'securitySolutionUI:network-anomalies',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-events',
                        link: 'securitySolutionUI:network-events',
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'users',
                    link: 'securitySolutionUI:users',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'users-all',
                        link: 'securitySolutionUI:users-all',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-authentications',
                        link: 'securitySolutionUI:users-authentications',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-anomalies',
                        link: 'securitySolutionUI:users-anomalies',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-risk',
                        link: 'securitySolutionUI:users-risk',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-events',
                        link: 'securitySolutionUI:users-events',
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
                id: 'assets',
                title: 'Assets',
                children: [
                  {
                    id: 'fleet:',
                    children: [
                      {
                        id: 'fleet:agents',
                        link: 'fleet:agents',
                      },
                      {
                        id: 'fleet:policies',
                        link: 'fleet:policies',
                      },
                      {
                        id: 'fleet:enrollment_tokens',
                        link: 'fleet:enrollment_tokens',
                      },
                      {
                        id: 'fleet:uninstall_tokens',
                        link: 'fleet:uninstall_tokens',
                      },
                      {
                        id: 'fleet:data_streams',
                        link: 'fleet:data_streams',
                      },
                      {
                        id: 'fleet:settings',
                        link: 'fleet:settings',
                      },
                    ],
                  },
                  {
                    id: 'endpoints',
                    title: 'Endpoints',
                    children: [
                      {
                        id: 'policy',
                        link: 'securitySolutionUI:policy',
                      },
                      {
                        id: 'trusted_apps',
                        link: 'securitySolutionUI:trusted_apps',
                      },
                      {
                        id: 'event_filters',
                        link: 'securitySolutionUI:event_filters',
                      },
                      {
                        id: 'host_isolation_exceptions',
                        link: 'securitySolutionUI:host_isolation_exceptions',
                      },
                      {
                        id: 'blocklist',
                        link: 'securitySolutionUI:blocklist',
                      },
                      {
                        id: 'response_actions_history',
                        link: 'securitySolutionUI:response_actions_history',
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
                id: 'machine_learning-landing',
                title: 'Machine learning',
                children: [
                  {
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:overview',
                        link: 'ml:overview',
                        title: 'Overview',
                      },
                      {
                        id: 'ml:notifications',
                        link: 'ml:notifications',
                        title: 'Notifications',
                      },
                      {
                        id: 'ml:memoryUsage',
                        link: 'ml:memoryUsage',
                        title: 'Memory usage',
                      },
                    ],
                  },
                  {
                    id: 'category-anomaly_detection',
                    title: 'Anomaly detection',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:anomalyDetection',
                        link: 'ml:anomalyDetection',
                        title: 'Jobs',
                      },
                      {
                        id: 'ml:anomalyExplorer',
                        link: 'ml:anomalyExplorer',
                        title: 'Anomaly explorer',
                      },
                      {
                        id: 'ml:singleMetricViewer',
                        link: 'ml:singleMetricViewer',
                        title: 'Single metric viewer',
                      },
                      {
                        id: 'ml:suppliedConfigurations',
                        link: 'ml:suppliedConfigurations',
                        title: 'Supplied configurations',
                      },
                      {
                        id: 'ml:settings',
                        link: 'ml:settings',
                        title: 'Settings',
                      },
                    ],
                  },
                  {
                    id: 'category-data_frame analytics',
                    title: 'Data frame analytics',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:dataFrameAnalytics',
                        link: 'ml:dataFrameAnalytics',
                        title: 'Jobs',
                      },
                      {
                        id: 'ml:resultExplorer',
                        link: 'ml:resultExplorer',
                        title: 'Result explorer',
                      },
                      {
                        id: 'ml:analyticsMap',
                        link: 'ml:analyticsMap',
                        title: 'Analytics map',
                      },
                    ],
                  },
                  {
                    id: 'category-model_management',
                    title: 'Model management',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:nodesOverview',
                        link: 'ml:nodesOverview',
                        title: 'Trained models',
                      },
                    ],
                  },
                  {
                    id: 'category-data_visualizer',
                    title: 'Data visualizer',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:fileUpload',
                        link: 'ml:fileUpload',
                        title: 'File data visualizer',
                      },
                      {
                        id: 'ml:indexDataVisualizer',
                        link: 'ml:indexDataVisualizer',
                        title: 'Data view data visualizer',
                      },
                      {
                        id: 'ml:esqlDataVisualizer',
                        link: 'ml:esqlDataVisualizer',
                        title: 'ES|QL data visualizer',
                      },
                      {
                        id: 'ml:dataDrift',
                        link: 'ml:dataDrift',
                        title: 'Data drift',
                      },
                    ],
                  },
                  {
                    id: 'category-aiops_labs',
                    title: 'Aiops labs',
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:logRateAnalysis',
                        link: 'ml:logRateAnalysis',
                        title: 'Log Rate Analysis',
                      },
                      {
                        id: 'ml:logPatternAnalysis',
                        link: 'ml:logPatternAnalysis',
                        title: 'Log pattern analysis',
                      },
                      {
                        id: 'ml:changePointDetections',
                        link: 'ml:changePointDetections',
                        title: 'Change point detection',
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
                id: 'entity_analytics-management',
                link: 'securitySolutionUI:entity_analytics-management',
                sideNavStatus: 'hidden',
              },
              {
                id: 'entity_analytics-entity_store_management',
                link: 'securitySolutionUI:entity_analytics-entity_store_management',
                sideNavStatus: 'hidden',
              },
            ],
          },
        ],
        isCollapsible: false,
      },
    ],
    footer: [
      {
        type: 'navItem',
        link: 'securitySolutionUI:get_started',
        icon: 'launch',
      },
      {
        type: 'navItem',
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'category-management',
        title: PROJECT_SETTINGS_TITLE,
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            title: 'Stack Management',
            renderAs: 'panelOpener',
            id: 'stack_management',
            spaceBefore: null,
            children: [
              {
                title: i18n.translate(
                  'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.data',
                  { defaultMessage: 'Data' }
                ),
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
                title: i18n.translate(
                  'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.access',
                  { defaultMessage: 'Access' }
                ),
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
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.usersAndRoles',
                      { defaultMessage: 'Manage organization members' }
                    ),
                  },
                ],
              },
              {
                title: i18n.translate(
                  'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.alertsAndInsights',
                  { defaultMessage: 'Alerts and Insights' }
                ),
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
                    link: 'securitySolutionUI:entity_analytics-management',
                    breadcrumbStatus: 'hidden',
                  },
                  {
                    link: 'securitySolutionUI:entity_analytics-entity_store_management',
                    breadcrumbStatus: 'hidden',
                  },
                ],
              },
              {
                title: i18n.translate(
                  'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.content',
                  { defaultMessage: 'Content' }
                ),
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
                title: i18n.translate(
                  'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.other',
                  { defaultMessage: 'Other' }
                ),
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
        ],
      },
    ],
  });
};

export const initSideNavigation = async (services: Services) => {
  services.securitySolution.setIsSolutionNavigationEnabled(true);

  services.serverless.initNavigation('security', createNavigationTree$(), {
    dataTestSubj: 'securitySolutionSideNav',
  });
};
