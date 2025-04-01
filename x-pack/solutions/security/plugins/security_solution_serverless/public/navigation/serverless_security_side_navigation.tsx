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
  SecurityPageName,
} from '@kbn/security-solution-navigation';
import { LinkButton, securityLink } from '@kbn/security-solution-navigation/links';
import { type Services } from '../common/services';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createServerlessSecurityNavigationTree$ = (
  services: Services
): Rx.Observable<NavigationTreeDefinition> => {
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
                link: securityLink(SecurityPageName.dashboards),
                renderAs: 'item',
                children: [
                  {
                    id: 'overview',
                    link: securityLink(SecurityPageName.overview),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'detection_response',
                    link: securityLink(SecurityPageName.detectionAndResponse),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cloud_security_posture-dashboard',
                    link: securityLink(SecurityPageName.cloudSecurityPostureDashboard),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cloud_security_posture-vulnerability_dashboard',
                    link: securityLink(SecurityPageName.cloudSecurityPostureVulnerabilityDashboard),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'entity_analytics',
                    link: securityLink(SecurityPageName.entityAnalytics),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'data_quality',
                    link: securityLink(SecurityPageName.dataQuality),
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
                link: securityLink(SecurityPageName.rulesLanding),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.rules', {
                  defaultMessage: 'Rules',
                }),
                children: [
                  {
                    id: 'category-management',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.rules.management',
                      { defaultMessage: 'Management' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'rules',
                        link: securityLink(SecurityPageName.rules),
                        renderAs: 'item',
                        children: [
                          {
                            id: 'rules-add',
                            link: securityLink(SecurityPageName.rulesAdd),
                          },
                          {
                            id: 'rules-create',
                            link: securityLink(SecurityPageName.rulesCreate),
                          },
                        ],
                      },
                      {
                        id: 'cloud_security_posture-benchmarks',
                        link: securityLink(SecurityPageName.cloudSecurityPostureBenchmarks),
                      },
                      {
                        id: 'exceptions',
                        link: securityLink(SecurityPageName.exceptions),
                      },
                      {
                        id: 'siem_migrations-rules',
                        link: securityLink(SecurityPageName.siemMigrationsRules),
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.rules.management.siemRuleMigrations',
                          { defaultMessage: 'SIEM rule migrations' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-discover',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.rules.discover',
                      { defaultMessage: 'Discover' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'coverage-overview',
                        link: securityLink(SecurityPageName.coverageOverview),
                      },
                    ],
                  },
                ],
                renderAs: 'panelOpener',
              },
              {
                id: 'alerts',
                link: securityLink(SecurityPageName.alerts),
              },
              {
                id: 'attack_discovery',
                link: securityLink(SecurityPageName.attackDiscovery),
              },
              {
                id: 'cloud_security_posture-findings',
                link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
              },
              {
                id: 'cases',
                link: securityLink(SecurityPageName.case),
                children: [
                  {
                    id: 'cases_create',
                    link: securityLink(SecurityPageName.caseCreate),
                    sideNavStatus: 'hidden',
                  },
                  {
                    id: 'cases_configure',
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
                id: 'investigations',
                link: securityLink(SecurityPageName.investigations),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.investigations', {
                  defaultMessage: 'Investigations',
                }),
                children: [
                  {
                    id: 'timelines',
                    link: securityLink(SecurityPageName.timelines),
                    renderAs: 'item',
                    children: [
                      {
                        id: 'timelines-templates',
                        link: securityLink(SecurityPageName.timelinesTemplates),
                        sideNavStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'notes',
                    link: securityLink(SecurityPageName.notes),
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
                link: securityLink(SecurityPageName.threatIntelligence),
              },
              {
                id: 'explore',
                link: securityLink(SecurityPageName.exploreLanding),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.explore', {
                  defaultMessage: 'Explore',
                }),
                children: [
                  {
                    id: 'hosts',
                    link: securityLink(SecurityPageName.hosts),
                    renderAs: 'item',
                    children: [
                      {
                        id: 'hosts-all',
                        link: securityLink(SecurityPageName.hostsAll),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-uncommon_processes',
                        link: securityLink(SecurityPageName.hostsUncommonProcesses),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-anomalies',
                        link: securityLink(SecurityPageName.hostsAnomalies),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-events',
                        link: securityLink(SecurityPageName.hostsEvents),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-risk',
                        link: securityLink(SecurityPageName.hostsRisk),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'hosts-sessions',
                        link: securityLink(SecurityPageName.hostsSessions),
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'network',
                    link: securityLink(SecurityPageName.network),
                    renderAs: 'item',
                    children: [
                      {
                        id: 'network-flows',
                        link: securityLink(SecurityPageName.networkFlows),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-dns',
                        link: securityLink(SecurityPageName.networkDns),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-http',
                        link: securityLink(SecurityPageName.networkHttp),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-tls',
                        link: securityLink(SecurityPageName.networkTls),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-anomalies',
                        link: securityLink(SecurityPageName.networkAnomalies),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'network-events',
                        link: securityLink(SecurityPageName.networkEvents),
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    id: 'users',
                    link: securityLink(SecurityPageName.users),
                    renderAs: 'item',
                    children: [
                      {
                        id: 'users-all',
                        link: securityLink(SecurityPageName.usersAll),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-authentications',
                        link: securityLink(SecurityPageName.usersAuthentications),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-anomalies',
                        link: securityLink(SecurityPageName.usersAnomalies),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-risk',
                        link: securityLink(SecurityPageName.usersRisk),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'users-events',
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
                id: 'assets',
                link: securityLink(SecurityPageName.assets),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.assets', {
                  defaultMessage: 'Assets',
                }),
                children: [
                  {
                    id: 'fleet:',
                    link: 'fleet',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.assets.fleet',
                      { defaultMessage: 'Fleet' }
                    ),
                    children: [
                      {
                        id: 'fleet:agents',
                        link: 'fleet:agents',
                      },
                      {
                        id: 'fleet:policies',
                        link: 'fleet:policies',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.assets.fleetPolicies',
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
                    link: securityLink(SecurityPageName.endpoints),
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.assets.endpoints',
                      { defaultMessage: 'Endpoints' }
                    ),
                    children: [
                      {
                        id: 'endpoints',
                        link: securityLink(SecurityPageName.endpoints),
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        id: 'policy',
                        link: securityLink(SecurityPageName.policies),
                      },
                      {
                        id: 'trusted_apps',
                        link: securityLink(SecurityPageName.trustedApps),
                      },
                      {
                        id: 'event_filters',
                        link: securityLink(SecurityPageName.eventFilters),
                      },
                      {
                        id: 'host_isolation_exceptions',
                        link: securityLink(SecurityPageName.hostIsolationExceptions),
                      },
                      {
                        id: 'blocklist',
                        link: securityLink(SecurityPageName.blocklist),
                      },
                      {
                        id: 'response_actions_history',
                        link: securityLink(SecurityPageName.responseActionsHistory),
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
                              'xpack.securitySolutionServerless.navLinks.assets.integrationsCallout.title',
                              { defaultMessage: 'Integrations' }
                            )}
                          >
                            <p>
                              {i18n.translate(
                                'xpack.securitySolutionServerless.navLinks.assets.integrationsCallout.body',
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
                                      'xpack.securitySolutionServerless.navLinks.assets.integrationsCallout.button',
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
                link: securityLink(SecurityPageName.mlLanding),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.ml', {
                  defaultMessage: 'Machine learning',
                }),
                children: [
                  {
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:overview',
                        link: 'ml:overview',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.overview',
                          { defaultMessage: 'Overview' }
                        ),
                      },
                      {
                        id: 'ml:notifications',
                        link: 'ml:notifications',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.notifications',
                          { defaultMessage: 'Notifications' }
                        ),
                      },
                      {
                        id: 'ml:memoryUsage',
                        link: 'ml:memoryUsage',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.memoryUsage',
                          { defaultMessage: 'Memory usage' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-anomaly_detection',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection',
                      { defaultMessage: 'Anomaly detection' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:anomalyDetection',
                        link: 'ml:anomalyDetection',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection.jobs',
                          { defaultMessage: 'Jobs' }
                        ),
                      },
                      {
                        id: 'ml:anomalyExplorer',
                        link: 'ml:anomalyExplorer',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection.anomalyExplorer',
                          { defaultMessage: 'Anomaly explorer' }
                        ),
                      },
                      {
                        id: 'ml:singleMetricViewer',
                        link: 'ml:singleMetricViewer',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection.singleMetricViewer',
                          { defaultMessage: 'Single metric viewer' }
                        ),
                      },
                      {
                        id: 'ml:suppliedConfigurations',
                        link: 'ml:suppliedConfigurations',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection.suppliedConfigurations',
                          { defaultMessage: 'Supplied configurations' }
                        ),
                      },
                      {
                        id: 'ml:settings',
                        link: 'ml:settings',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.anomalyDetection.settings',
                          { defaultMessage: 'Settings' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-data_frame analytics',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.ml.dataFrameAnalytics',
                      { defaultMessage: 'Data frame analytics' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:dataFrameAnalytics',
                        link: 'ml:dataFrameAnalytics',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataFrameAnalytics.jobs',
                          { defaultMessage: 'Jobs' }
                        ),
                      },
                      {
                        id: 'ml:resultExplorer',
                        link: 'ml:resultExplorer',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataFrameAnalytics.resultExplorer',
                          { defaultMessage: 'Result explorer' }
                        ),
                      },
                      {
                        id: 'ml:analyticsMap',
                        link: 'ml:analyticsMap',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataFrameAnalytics.analyticsMap',
                          { defaultMessage: 'Analytics map' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-model_management',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.ml.modelManagement',
                      { defaultMessage: 'Model management' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:nodesOverview',
                        link: 'ml:nodesOverview',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.modelManagement.trainedModels',
                          { defaultMessage: 'Trained models' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-data_visualizer',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.ml.dataVisualizer',
                      { defaultMessage: 'Data visualizer' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:fileUpload',
                        link: 'ml:fileUpload',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataVisualizer.fileDataVisualizer',
                          { defaultMessage: 'File data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:indexDataVisualizer',
                        link: 'ml:indexDataVisualizer',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataVisualizer.dataViewDataVisualizer',
                          { defaultMessage: 'Data view data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:esqlDataVisualizer',
                        link: 'ml:esqlDataVisualizer',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataVisualizer.esqlDataVisualizer',
                          { defaultMessage: 'ES|QL data visualizer' }
                        ),
                      },
                      {
                        id: 'ml:dataDrift',
                        link: 'ml:dataDrift',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.dataVisualizer.dataDrift',
                          { defaultMessage: 'Data drift' }
                        ),
                      },
                    ],
                  },
                  {
                    id: 'category-aiops_labs',
                    title: i18n.translate(
                      'xpack.securitySolutionServerless.navLinks.ml.aiopsLabs',
                      { defaultMessage: 'Aiops labs' }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      {
                        id: 'ml:logRateAnalysis',
                        link: 'ml:logRateAnalysis',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.aiopsLabs.logRateAnalysis',
                          { defaultMessage: 'Log Rate Analysis' }
                        ),
                      },
                      {
                        id: 'ml:logPatternAnalysis',
                        link: 'ml:logPatternAnalysis',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.aiopsLabs.logPatternAnalysis',
                          { defaultMessage: 'Log pattern analysis' }
                        ),
                      },
                      {
                        id: 'ml:changePointDetections',
                        link: 'ml:changePointDetections',
                        title: i18n.translate(
                          'xpack.securitySolutionServerless.navLinks.ml.aiopsLabs.changePointDetection',
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
                link: securityLink(SecurityPageName.entityAnalyticsManagement),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.entityRiskScore', {
                  defaultMessage: 'Entity Risk Score',
                }),
                sideNavStatus: 'hidden',
              },
              {
                id: 'entity_analytics-entity_store_management',
                link: securityLink(SecurityPageName.entityAnalyticsEntityStoreManagement),
                title: i18n.translate('xpack.securitySolutionServerless.navLinks.entityStore', {
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
        link: securityLink(SecurityPageName.landing),
        icon: 'launch',
      },
      {
        type: 'navItem',
        link: 'dev_tools',
        title: i18n.translate('xpack.securitySolutionServerless.navLinks.devTools', {
          defaultMessage: 'Developer tools',
        }),
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'category-management',
        title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.title', {
          defaultMessage: 'Project Settings',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            title: i18n.translate('xpack.securitySolutionServerless.navLinks.stackManagement', {
              defaultMessage: 'Stack Management',
            }),
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
