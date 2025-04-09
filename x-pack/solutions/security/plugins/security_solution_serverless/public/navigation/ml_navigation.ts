/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

export const createMachineLearningNavigationTree = (): GroupDefinition => ({
  type: 'navGroup',
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
          id: 'ml:data_visualizer',
          link: 'ml:dataVisualizer',
          title: i18nStrings.ml.dataVisualizer,
        },
      ],
    },
    {
      id: 'category-anomaly_detection',
      title: i18nStrings.ml.anomalyDetection.title,
      breadcrumbStatus: 'hidden',
      children: [
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
      ],
    },
    {
      id: 'category-data_frame analytics',
      title: i18nStrings.ml.dataFrameAnalytics.title,
      breadcrumbStatus: 'hidden',
      children: [
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
});
