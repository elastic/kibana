/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import {
  MachineLearningAnomaliesTableProvider,
  MachineLearningAnomalyExplorerProvider,
  MachineLearningAPIProvider,
  MachineLearningCommonProvider,
  MachineLearningCustomUrlsProvider,
  MachineLearningDataFrameAnalyticsProvider,
  MachineLearningDataFrameAnalyticsCreationProvider,
  MachineLearningDataFrameAnalyticsTableProvider,
  MachineLearningDataVisualizerProvider,
  MachineLearningDataVisualizerFileBasedProvider,
  MachineLearningDataVisualizerIndexBasedProvider,
  MachineLearningJobManagementProvider,
  MachineLearningJobSelectionProvider,
  MachineLearningJobSourceSelectionProvider,
  MachineLearningJobTableProvider,
  MachineLearningJobTypeSelectionProvider,
  MachineLearningJobWizardAdvancedProvider,
  MachineLearningJobWizardCategorizationProvider,
  MachineLearningJobWizardCommonProvider,
  MachineLearningJobWizardMultiMetricProvider,
  MachineLearningJobWizardPopulationProvider,
  MachineLearningNavigationProvider,
  MachineLearningSecurityCommonProvider,
  MachineLearningSecurityUIProvider,
  MachineLearningSettingsProvider,
  MachineLearningSingleMetricViewerProvider,
  MachineLearningTestResourcesProvider,
} from './machine_learning';

export function MachineLearningProvider(context: FtrProviderContext) {
  const common = MachineLearningCommonProvider(context);

  const anomaliesTable = MachineLearningAnomaliesTableProvider(context);
  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context);
  const api = MachineLearningAPIProvider(context);
  const customUrls = MachineLearningCustomUrlsProvider(context);
  const dataFrameAnalytics = MachineLearningDataFrameAnalyticsProvider(context, api);
  const dataFrameAnalyticsCreation = MachineLearningDataFrameAnalyticsCreationProvider(
    context,
    common,
    api
  );
  const dataFrameAnalyticsTable = MachineLearningDataFrameAnalyticsTableProvider(context);
  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const dataVisualizerFileBased = MachineLearningDataVisualizerFileBasedProvider(context, common);
  const dataVisualizerIndexBased = MachineLearningDataVisualizerIndexBasedProvider(context);
  const jobManagement = MachineLearningJobManagementProvider(context, api);
  const jobSelection = MachineLearningJobSelectionProvider(context);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context);
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardAdvanced = MachineLearningJobWizardAdvancedProvider(context, common);
  const jobWizardCategorization = MachineLearningJobWizardCategorizationProvider(context);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(context, common, customUrls);
  const jobWizardMultiMetric = MachineLearningJobWizardMultiMetricProvider(context);
  const jobWizardPopulation = MachineLearningJobWizardPopulationProvider(context);
  const navigation = MachineLearningNavigationProvider(context);
  const securityCommon = MachineLearningSecurityCommonProvider(context);
  const securityUI = MachineLearningSecurityUIProvider(context, securityCommon);
  const settings = MachineLearningSettingsProvider(context);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context);

  return {
    anomaliesTable,
    anomalyExplorer,
    api,
    common,
    customUrls,
    dataFrameAnalytics,
    dataFrameAnalyticsCreation,
    dataFrameAnalyticsTable,
    dataVisualizer,
    dataVisualizerFileBased,
    dataVisualizerIndexBased,
    jobManagement,
    jobSelection,
    jobSourceSelection,
    jobTable,
    jobTypeSelection,
    jobWizardAdvanced,
    jobWizardCategorization,
    jobWizardCommon,
    jobWizardMultiMetric,
    jobWizardPopulation,
    navigation,
    securityCommon,
    securityUI,
    settings,
    singleMetricViewer,
    testResources,
  };
}
