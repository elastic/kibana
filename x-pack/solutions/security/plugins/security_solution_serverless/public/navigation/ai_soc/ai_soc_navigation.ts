/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { securityLink } from '@kbn/security-solution-navigation/links';
import { type SecurityProductTypes } from '../../../common/config';
import { ProductLine } from '../../../common/product';
import { AiForTheSocIcon } from './icons';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.socNavLinks.projectType.title',
  { defaultMessage: 'AI for SOC' }
);

export const shouldUseAINavigation = (productTypes: SecurityProductTypes) =>
  productTypes.some((productType) => productType.product_line === ProductLine.aiSoc);

export const createAiSocNavigationTree$ = (): Rx.Observable<NavigationTreeDefinition> => {
  return Rx.of({
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_ai_nav',
        title: SOLUTION_NAME,
        icon: AiForTheSocIcon,
        breadcrumbStatus: 'hidden',
        defaultIsCollapsed: false,
        isCollapsible: false,
        children: [
          {
            id: 'discover:',
            link: 'discover',
          },
          {
            id: 'attack_discovery',
            link: securityLink(SecurityPageName.attackDiscovery),
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
          {
            id: 'machine_learning-landing',
            link: securityLink(SecurityPageName.mlLanding),
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
          {
            id: 'alert_summary',
            link: securityLink(SecurityPageName.alertSummary),
          },
          {
            id: 'configurations',
            link: securityLink(SecurityPageName.configurations),
            renderAs: 'panelOpener',
            children: [
              {
                link: securityLink(SecurityPageName.configurationsAiSettings),
              },
              {
                link: securityLink(SecurityPageName.configurationsBasicRules),
              },
              {
                link: securityLink(SecurityPageName.configurationsIntegrations),
              },
            ],
          },
        ],
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
        title: 'Developer tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'category-management',
        title: 'Project Settings',
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
                title: 'Data',
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
                title: 'Access',
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
                    title: 'Manage organization members',
                  },
                ],
              },
              {
                title: 'Alerts and Insights',
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
                title: 'Content',
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
                title: 'Other',
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
          {
            link: 'integrations',
          },
          {
            cloudLink: 'billingAndSub',
            openInNewTab: true,
          },
        ],
      },
    ],
  });
};
