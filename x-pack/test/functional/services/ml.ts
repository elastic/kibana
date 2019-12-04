/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import {
  MachineLearningAnomalyExplorerProvider,
  MachineLearningAPIProvider,
  MachineLearningDataFrameAnalyticsProvider,
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
  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context);
  const api = MachineLearningAPIProvider(context);
  const dataFrameAnalytics = MachineLearningDataFrameAnalyticsProvider(context);
  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const dataVisualizerIndexBased = MachineLearningDataVisualizerIndexBasedProvider(context);
  const jobManagement = MachineLearningJobManagementProvider(context, api);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context);
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardAdvanced = MachineLearningJobWizardAdvancedProvider(context);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(context);
  const jobWizardMultiMetric = MachineLearningJobWizardMultiMetricProvider(context);
  const jobWizardPopulation = MachineLearningJobWizardPopulationProvider(context);
  const navigation = MachineLearningNavigationProvider(context);
  const settings = MachineLearningSettingsProvider(context);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context);

  return {
    anomalyExplorer,
    api,
    dataFrameAnalytics,
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
