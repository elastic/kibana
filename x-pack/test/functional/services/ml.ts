/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import {
  MachineLearningAnomalyExplorerProvider,
  MachineLearningAPIProvider,
  MachineLearningCommonProvider,
  MachineLearningCustomUrlsProvider,
  MachineLearningDataFrameAnalyticsProvider,
  MachineLearningDataFrameAnalyticsCreationProvider,
  MachineLearningDataFrameAnalyticsTableProvider,
  MachineLearningDataVisualizerProvider,
  MachineLearningDataVisualizerIndexBasedProvider,
  MachineLearningJobManagementProvider,
  MachineLearningJobSourceSelectionProvider,
  MachineLearningJobTableProvider,
  MachineLearningJobTypeSelectionProvider,
  MachineLearningJobWizardAdvancedProvider,
  MachineLearningJobWizardCommonProvider,
  MachineLearningJobWizardMultiMetricProvider,
  MachineLearningJobWizardPopulationProvider,
  MachineLearningNavigationProvider,
  MachineLearningSettingsProvider,
  MachineLearningSingleMetricViewerProvider,
} from './machine_learning';

export function MachineLearningProvider(context: FtrProviderContext) {
  const common = MachineLearningCommonProvider(context);

  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context);
  const api = MachineLearningAPIProvider(context);
  const customUrls = MachineLearningCustomUrlsProvider(context);
  const dataFrameAnalytics = MachineLearningDataFrameAnalyticsProvider(context, api);
  const dataFrameAnalyticsCreation = MachineLearningDataFrameAnalyticsCreationProvider(context);
  const dataFrameAnalyticsTable = MachineLearningDataFrameAnalyticsTableProvider(context);
  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const dataVisualizerIndexBased = MachineLearningDataVisualizerIndexBasedProvider(context);
  const jobManagement = MachineLearningJobManagementProvider(context, api);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context);
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardAdvanced = MachineLearningJobWizardAdvancedProvider(context, common);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(context, common, customUrls);
  const jobWizardMultiMetric = MachineLearningJobWizardMultiMetricProvider(context);
  const jobWizardPopulation = MachineLearningJobWizardPopulationProvider(context);
  const navigation = MachineLearningNavigationProvider(context);
  const settings = MachineLearningSettingsProvider(context);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context);

  return {
    anomalyExplorer,
    api,
    customUrls,
    dataFrameAnalytics,
    dataFrameAnalyticsCreation,
    dataFrameAnalyticsTable,
    dataVisualizer,
    dataVisualizerIndexBased,
    jobManagement,
    jobSourceSelection,
    jobTable,
    jobTypeSelection,
    jobWizardAdvanced,
    jobWizardCommon,
    jobWizardMultiMetric,
    jobWizardPopulation,
    navigation,
    settings,
    singleMetricViewer,
  };
}
