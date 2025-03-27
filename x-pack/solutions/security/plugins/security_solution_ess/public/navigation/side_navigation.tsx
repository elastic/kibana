/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as Rx from 'rxjs';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import {
  ExternalPageName,
  NavigationProvider,
  SECURITY_UI_APP_ID,
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { type Services } from '../common/services';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolutionEss.nav.solutionName', {
  defaultMessage: 'Security',
});

const createNavigationTree$ = (services: Services): Rx.Observable<NavigationTreeDefinition> => {
  return Rx.of({
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_nav',
        title: SOLUTION_NAME,
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
                link: 'securitySolutionUI:rules-landing',
                title: i18n.translate('xpack.securitySolutionEss.nav.rules', {
                  defaultMessage: 'Rules',
                }),
                children: [
                  {
                    id: 'category-management',
                    title: i18n.translate('xpack.securitySolutionEss.nav.rules.management', {
                      defaultMessage: 'Management',
                    }),
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
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.rules.management.siemRuleMigrations',
                          { defaultMessage: 'SIEM rule migrations' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-discover',
                    title: i18n.translate('xpack.securitySolutionEss.nav.rules.discover', {
                      defaultMessage: 'Discover',
                    }),
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
                link: 'securitySolutionUI:investigations',
                title: i18n.translate('xpack.securitySolutionEss.nav.investigations', {
                  defaultMessage: 'Investigations',
                }),
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
                link: 'securitySolutionUI:explore',
                title: i18n.translate('xpack.securitySolutionEss.nav.explore', {
                  defaultMessage: 'Explore',
                }),
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
                link: 'securitySolutionUI:assets',
                title: i18n.translate('xpack.securitySolutionEss.nav.assets', {
                  defaultMessage: 'Assets',
                }),
                children: [
                  {
                    id: 'fleet:',
                    link: 'fleet',
                    title: i18n.translate('xpack.securitySolutionEss.nav.assets.fleet', {
                      defaultMessage: 'Fleet',
                    }),
                    children: [
                      {
                        id: 'fleet:agents',
                        link: 'fleet:agents',
                      },
                      {
                        id: 'fleet:policies',
                        link: 'fleet:policies',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.assets.fleet.policies',
                          { defaultMessage: 'Policies' }
                        ),
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
                    link: 'securitySolutionUI:endpoints',
                    title: i18n.translate('xpack.securitySolutionEss.nav.assets.endpoints', {
                      defaultMessage: 'Endpoints',
                    }),
                    children: [
                      {
                        id: 'endpoints',
                        link: 'securitySolutionUI:endpoints',
                        breadcrumbStatus: 'hidden',
                      },
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
                  {
                    id: 'assets_custom',
                    title: '',
                    renderItem: () => {
                      return (
                        <>
                          <EuiSpacer />
                          <EuiCallOut
                            iconType="cluster"
                            title={i18n.translate(
                              'xpack.securitySolutionEss.nav.assets.integrationsCallout.title',
                              { defaultMessage: 'Integrations' }
                            )}
                          >
                            <p>
                              {i18n.translate(
                                'xpack.securitySolutionEss.nav.assets.integrationsCallout.body',
                                {
                                  defaultMessage:
                                    'Choose an integration to start collecting and analyzing your data.',
                                }
                              )}
                            </p>
                            <EuiFlexGroup>
                              <EuiFlexItem>
                                <NavigationProvider core={services}>
                                  <LinkButton id={ExternalPageName.integrationsSecurity} fill>
                                    {i18n.translate(
                                      'xpack.securitySolutionEss.nav.assets.integrationsCallout.button',
                                      { defaultMessage: 'Browse integrations' }
                                    )}
                                  </LinkButton>
                                </NavigationProvider>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiCallOut>
                        </>
                      );
                    },
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
                link: 'securitySolutionUI:machine_learning-landing',
                title: i18n.translate('xpack.securitySolutionEss.nav.ml', {
                  defaultMessage: 'Machine learning',
                }),
                children: [
                  {
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:overview',
                        link: 'ml:overview',
                        title: i18n.translate('xpack.securitySolutionEss.nav.ml.overview', {
                          defaultMessage: 'Overview',
                        }),
                      },
                      {
                        id: 'ml:notifications',
                        link: 'ml:notifications',
                        title: i18n.translate('xpack.securitySolutionEss.nav.ml.notifications', {
                          defaultMessage: 'Notifications',
                        }),
                      },
                      {
                        id: 'ml:memoryUsage',
                        link: 'ml:memoryUsage',
                        title: i18n.translate('xpack.securitySolutionEss.nav.ml.memoryUsage', {
                          defaultMessage: 'Memory usage',
                        }),
                      },
                    ],
                  },
                  {
                    id: 'category-anomaly_detection',
                    title: i18n.translate('xpack.securitySolutionEss.nav.ml.anomalyDetection', {
                      defaultMessage: 'Anomaly detection',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:anomalyDetection',
                        link: 'ml:anomalyDetection',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.anomalyDetection.jobs',
                          { defaultMessage: 'Jobs' }
                        ),
                      },
                      {
                        id: 'ml:anomalyExplorer',
                        link: 'ml:anomalyExplorer',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.anomalyDetection.anomalyExplorer',
                          { defaultMessage: 'Anomaly explorer' }
                        ),
                      },
                      {
                        id: 'ml:singleMetricViewer',
                        link: 'ml:singleMetricViewer',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.anomalyDetection.singleMetricViewer',
                          { defaultMessage: 'Single metric viewer' }
                        ),
                      },
                      {
                        id: 'ml:suppliedConfigurations',
                        link: 'ml:suppliedConfigurations',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.anomalyDetection.suppliedConfigurations',
                          { defaultMessage: 'Supplied configurations' }
                        ),
                      },
                      {
                        id: 'ml:settings',
                        link: 'ml:settings',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.anomalyDetection.settings',
                          { defaultMessage: 'Settings' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-data_frame analytics',
                    title: i18n.translate('xpack.securitySolutionEss.nav.ml.dataFrameAnalytics', {
                      defaultMessage: 'Data frame analytics',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:dataFrameAnalytics',
                        link: 'ml:dataFrameAnalytics',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataFrameAnalytics.jobs',
                          { defaultMessage: 'Jobs' }
                        ),
                      },
                      {
                        id: 'ml:resultExplorer',
                        link: 'ml:resultExplorer',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataFrameAnalytics.resultExplorer',
                          { defaultMessage: 'Result explorer' }
                        ),
                      },
                      {
                        id: 'ml:analyticsMap',
                        link: 'ml:analyticsMap',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataFrameAnalytics.analyticsMap',
                          { defaultMessage: 'Analytics map' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-model_management',
                    title: i18n.translate('xpack.securitySolutionEss.nav.ml.modelManagement', {
                      defaultMessage: 'Model management',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:nodesOverview',
                        link: 'ml:nodesOverview',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.modelManagement.trainedModels',
                          { defaultMessage: 'Trained models' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-data_visualizer',
                    title: i18n.translate('xpack.securitySolutionEss.nav.ml.dataVisualizer', {
                      defaultMessage: 'Data visualizer',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:fileUpload',
                        link: 'ml:fileUpload',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataVisualizer.fileDataVisualizer',
                          { defaultMessage: 'File data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:indexDataVisualizer',
                        link: 'ml:indexDataVisualizer',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataVisualizer.dataViewDataVisualizer',
                          { defaultMessage: 'Data view data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:esqlDataVisualizer',
                        link: 'ml:esqlDataVisualizer',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataVisualizer.esqlDataVisualizer',
                          { defaultMessage: 'ES|QL data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:dataDrift',
                        link: 'ml:dataDrift',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.dataVisualizer.dataDrift',
                          { defaultMessage: 'Data drift' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-aiops_labs',
                    title: i18n.translate('xpack.securitySolutionEss.nav.ml.aiopsLabs', {
                      defaultMessage: 'Aiops labs',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:logRateAnalysis',
                        link: 'ml:logRateAnalysis',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.aiopsLabs.logRateAnalysis',
                          { defaultMessage: 'Log rate analysis' }
                        ),
                      },
                      {
                        id: 'ml:logPatternAnalysis',
                        link: 'ml:logPatternAnalysis',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.aiopsLabs.logPatternAnalysis',
                          { defaultMessage: 'Log pattern analysis' }
                        ),
                      },
                      {
                        id: 'ml:changePointDetections',
                        link: 'ml:changePointDetections',
                        title: i18n.translate(
                          'xpack.securitySolutionEss.nav.ml.aiopsLabs.changePointDetection',
                          { defaultMessage: 'Change point detection' }
                        ),
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
                title: i18n.translate('xpack.securitySolutionEss.nav.entityRiskScore', {
                  defaultMessage: 'Entity Risk Score',
                }),
                sideNavStatus: 'hidden',
              },
              {
                id: 'entity_analytics-entity_store_management',
                link: 'securitySolutionUI:entity_analytics-entity_store_management',
                title: i18n.translate('xpack.securitySolutionEss.nav.entityStore', {
                  defaultMessage: 'Entity Store',
                }),
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
        title: i18n.translate('xpack.securitySolutionEss.nav.devTools', {
          defaultMessage: 'Developer tools',
        }),
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'category-management',
        title: i18n.translate('xpack.securitySolutionEss.nav.management', {
          defaultMessage: 'Management',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement', {
              defaultMessage: 'Stack Management',
            }),
            renderAs: 'panelOpener',
            id: 'stack_management',
            spaceBefore: null,
            children: [
              {
                title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement.ingest', {
                  defaultMessage: 'Ingest',
                }),
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
                title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement.data', {
                  defaultMessage: 'Data',
                }),
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
                title: i18n.translate(
                  'xpack.securitySolutionEss.nav.stackManagement.alertsAndInsights',
                  { defaultMessage: 'Alerts and Insights' }
                ),
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
                    link: 'securitySolutionUI:entity_analytics-management',
                  },
                  {
                    link: 'securitySolutionUI:entity_analytics-entity_store_management',
                  },
                ],
              },
              {
                title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement.security', {
                  defaultMessage: 'Security',
                }),
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
                title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement.kibana', {
                  defaultMessage: 'Kibana',
                }),
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
                title: i18n.translate('xpack.securitySolutionEss.nav.stackManagement.stack', {
                  defaultMessage: 'Stack',
                }),
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
            title: i18n.translate('xpack.securitySolutionEss.nav.stackMonitoring', {
              defaultMessage: 'Stack Monitoring',
            }),
            link: 'monitoring',
          },
          {
            title: i18n.translate('xpack.securitySolutionEss.nav.integrations', {
              defaultMessage: 'Integrations',
            }),
            link: 'integrations',
          },
        ],
      },
    ],
  });
};

export const initSideNavigation = async (services: Services) => {
  const { securitySolution, navigation } = services;

  navigation.isSolutionNavEnabled$.subscribe((isSolutionNavigationEnabled) => {
    securitySolution.setIsSolutionNavigationEnabled(isSolutionNavigationEnabled);
  });

  navigation.addSolutionNavigation({
    id: 'security',
    homePage: `${SECURITY_UI_APP_ID}:${SecurityPageName.landing}`,
    title: SOLUTION_NAME,
    icon: 'logoSecurity',
    navigationTree$: createNavigationTree$(services),
    dataTestSubj: 'securitySolutionSideNav',
  });
};
