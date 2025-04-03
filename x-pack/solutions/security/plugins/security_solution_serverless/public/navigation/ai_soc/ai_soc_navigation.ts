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
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { type SecurityProductTypes } from '../../../common/config';
import { ProductLine } from '../../../common/product';
import { AiForTheSocIcon } from './icons';
import { createStackManagementNavigationTree } from '../stack_management_navigation';

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
        title: i18nStrings.devTools,
        icon: 'editorCodeBlock',
      },
      createStackManagementNavigationTree(),
    ],
  });
};
