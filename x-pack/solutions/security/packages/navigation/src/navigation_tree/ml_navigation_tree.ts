/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { i18nStrings } from '../i18n_strings';

export const createMachineLearningNavigationTree = (): NodeDefinition => ({
  id: SecurityGroupName.machineLearning,
  icon: 'productML',
  title: SecurityLinkGroup[SecurityGroupName.machineLearning].title,
  renderAs: 'panelOpener',
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
        },
        {
          link: 'ml:dataDrift',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:dataDriftPage',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:fileUpload',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:indexDataVisualizer',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:indexDataVisualizerPage',
          sideNavStatus: 'hidden',
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
          link: 'ml:logRateAnalysisPage',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:logPatternAnalysis',
          title: i18nStrings.ml.aiopsLabs.logPatternAnalysis,
        },
        {
          link: 'ml:logPatternAnalysisPage',
          sideNavStatus: 'hidden',
        },
        {
          link: 'ml:changePointDetections',
          title: i18nStrings.ml.aiopsLabs.changePointDetection,
        },
        {
          link: 'ml:changePointDetectionsPage',
          sideNavStatus: 'hidden',
        },
      ],
    },
  ],
});
