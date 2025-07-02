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
import { LinkButton, i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { type Services } from '../common/services';
import { createStackManagementNavigationTree } from './stack_management_navigation';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectType.title',
  { defaultMessage: 'Security' }
);

export const createSecurityNavigationTree$ = (
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
          {
            id: 'rules-landing',
            link: securityLink(SecurityPageName.rulesLanding),
            title: i18nStrings.rules.title,
            children: [
              {
                id: 'category-management',
                title: i18nStrings.rules.management.title,
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
                    title: i18nStrings.rules.management.siemMigrationsRules,
                  },
                ],
              },
              {
                id: 'category-discover',
                title: i18nStrings.rules.management.discover,
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
            renderAs: 'item',
          },
          {
            id: 'investigations',
            link: securityLink(SecurityPageName.investigations),
            title: i18nStrings.investigations.title,
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
            title: i18nStrings.explore.title,
            spaceBefore: null,
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
          {
            id: 'assets',
            link: securityLink(SecurityPageName.assets),
            title: i18nStrings.assets.title,
            children: [
              {
                id: 'fleet:',
                link: 'fleet',
                title: i18nStrings.assets.fleet.title,
                children: [
                  {
                    id: 'fleet:agents',
                    link: 'fleet:agents',
                  },
                  {
                    id: 'fleet:policies',
                    link: 'fleet:policies',
                    title: i18nStrings.assets.fleet.policies,
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
                title: i18nStrings.assets.endpoints.title,
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
                        title={i18nStrings.assets.integrationsCallout.title}
                      >
                        <p>{i18nStrings.assets.integrationsCallout.body}</p>
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <NavigationProvider core={services}>
                              <LinkButton id={ExternalPageName.integrationsSecurity} fill>
                                {i18nStrings.assets.integrationsCallout.button}
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
          {
            id: 'machine_learning-landing',
            link: securityLink(SecurityPageName.mlLanding),
            title: i18nStrings.ml.title,
            children: [
              {
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:overview',
                    link: 'ml:overview',
                    title: i18nStrings.ml.overview,
                  },
                  {
                    id: 'ml:notifications',
                    link: 'ml:notifications',
                    title: i18nStrings.ml.notifications,
                  },
                  {
                    id: 'ml:memoryUsage',
                    link: 'ml:memoryUsage',
                    title: i18nStrings.ml.memoryUsage,
                  },
                ],
              },
              {
                id: 'category-anomaly_detection',
                title: i18nStrings.ml.anomalyDetection.title,
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:anomalyDetection',
                    link: 'ml:anomalyDetection',
                    title: i18nStrings.ml.anomalyDetection.jobs,
                  },
                  {
                    id: 'ml:anomalyExplorer',
                    link: 'ml:anomalyExplorer',
                    title: i18nStrings.ml.anomalyDetection.anomalyExplorer,
                  },
                  {
                    id: 'ml:singleMetricViewer',
                    link: 'ml:singleMetricViewer',
                    title: i18nStrings.ml.anomalyDetection.singleMetricViewer,
                  },
                  {
                    id: 'ml:suppliedConfigurations',
                    link: 'ml:suppliedConfigurations',
                    title: i18nStrings.ml.anomalyDetection.suppliedConfigurations,
                  },
                  {
                    id: 'ml:settings',
                    link: 'ml:settings',
                    title: i18nStrings.ml.anomalyDetection.settings,
                  },
                ],
              },
              {
                id: 'category-data_frame analytics',
                title: i18nStrings.ml.dataFrameAnalytics.title,
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:dataFrameAnalytics',
                    link: 'ml:dataFrameAnalytics',
                    title: i18nStrings.ml.dataFrameAnalytics.jobs,
                  },
                  {
                    id: 'ml:resultExplorer',
                    link: 'ml:resultExplorer',
                    title: i18nStrings.ml.dataFrameAnalytics.resultExplorer,
                  },
                  {
                    id: 'ml:analyticsMap',
                    link: 'ml:analyticsMap',
                    title: i18nStrings.ml.dataFrameAnalytics.analyticsMap,
                  },
                ],
              },
              {
                id: 'category-model_management',
                title: i18nStrings.ml.modelManagement.title,
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:nodesOverview',
                    link: 'ml:nodesOverview',
                    title: i18nStrings.ml.modelManagement.trainedModels,
                  },
                ],
              },
              {
                id: 'category-data_visualizer',
                title: i18nStrings.ml.dataVisualizer.title,
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:fileUpload',
                    link: 'ml:fileUpload',
                    title: i18nStrings.ml.dataVisualizer.fileDataVisualizer,
                  },
                  {
                    id: 'ml:indexDataVisualizer',
                    link: 'ml:indexDataVisualizer',
                    title: i18nStrings.ml.dataVisualizer.dataViewDataVisualizer,
                  },
                  {
                    id: 'ml:esqlDataVisualizer',
                    link: 'ml:esqlDataVisualizer',
                    title: i18nStrings.ml.dataVisualizer.esqlDataVisualizer,
                  },
                  {
                    id: 'ml:dataDrift',
                    link: 'ml:dataDrift',
                    title: i18nStrings.ml.dataVisualizer.dataDrift,
                  },
                ],
              },
              {
                id: 'category-aiops_labs',
                title: i18nStrings.ml.aiopsLabs.title,
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    id: 'ml:logRateAnalysis',
                    link: 'ml:logRateAnalysis',
                    title: i18nStrings.ml.aiopsLabs.logRateAnalysis,
                  },
                  {
                    id: 'ml:logPatternAnalysis',
                    link: 'ml:logPatternAnalysis',
                    title: i18nStrings.ml.aiopsLabs.logPatternAnalysis,
                  },
                  {
                    id: 'ml:changePointDetections',
                    link: 'ml:changePointDetections',
                    title: i18nStrings.ml.aiopsLabs.changePointDetection,
                  },
                ],
              },
            ],
            renderAs: 'panelOpener',
          },
          {
            id: 'entity_analytics-management',
            link: securityLink(SecurityPageName.entityAnalyticsManagement),
            title: i18nStrings.entityRiskScore,
            sideNavStatus: 'hidden',
          },
          {
            id: 'entity_analytics-entity_store_management',
            link: securityLink(SecurityPageName.entityAnalyticsEntityStoreManagement),
            title: i18nStrings.entityStore,
            sideNavStatus: 'hidden',
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
        title: i18nStrings.devTools,
        icon: 'editorCodeBlock',
      },
      createStackManagementNavigationTree(),
    ],
  });
};
