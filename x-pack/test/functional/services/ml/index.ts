/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { MachineLearningAnomaliesTableProvider } from './anomalies_table';
import { MachineLearningAnomalyExplorerProvider } from './anomaly_explorer';
import { MachineLearningAPIProvider } from './api';
import { MachineLearningCommonAPIProvider } from './common_api';
import { MachineLearningCommonConfigsProvider } from './common_config';
import { MachineLearningCommonUIProvider } from './common_ui';
import { MachineLearningCustomUrlsProvider } from './custom_urls';
import { MachineLearningDataFrameAnalyticsProvider } from './data_frame_analytics';
import { MachineLearningDataFrameAnalyticsCreationProvider } from './data_frame_analytics_creation';
import { MachineLearningDataFrameAnalyticsEditProvider } from './data_frame_analytics_edit';
import { MachineLearningDataFrameAnalyticsResultsProvider } from './data_frame_analytics_results';
import { MachineLearningDataFrameAnalyticsTableProvider } from './data_frame_analytics_table';
import { MachineLearningDataVisualizerProvider } from './data_visualizer';
import { MachineLearningDataVisualizerFileBasedProvider } from './data_visualizer_file_based';
import { MachineLearningDataVisualizerIndexBasedProvider } from './data_visualizer_index_based';
import { MachineLearningJobManagementProvider } from './job_management';
import { MachineLearningJobSelectionProvider } from './job_selection';
import { MachineLearningJobSourceSelectionProvider } from './job_source_selection';
import { MachineLearningJobTableProvider } from './job_table';
import { MachineLearningJobTypeSelectionProvider } from './job_type_selection';
import { MachineLearningJobWizardAdvancedProvider } from './job_wizard_advanced';
import { MachineLearningJobWizardCommonProvider } from './job_wizard_common';
import { MachineLearningJobWizardCategorizationProvider } from './job_wizard_categorization';
import { MachineLearningJobWizardMultiMetricProvider } from './job_wizard_multi_metric';
import { MachineLearningJobWizardPopulationProvider } from './job_wizard_population';
import { MachineLearningNavigationProvider } from './navigation';
import { MachineLearningOverviewPageProvider } from './overview_page';
import { MachineLearningSecurityCommonProvider } from './security_common';
import { MachineLearningSecurityUIProvider } from './security_ui';
import { MachineLearningSettingsProvider } from './settings';
import { MachineLearningSettingsCalendarProvider } from './settings_calendar';
import { MachineLearningSettingsFilterListProvider } from './settings_filter_list';
import { MachineLearningSingleMetricViewerProvider } from './single_metric_viewer';
import { MachineLearningTestExecutionProvider } from './test_execution';
import { MachineLearningTestResourcesProvider } from './test_resources';

export function MachineLearningProvider(context: FtrProviderContext) {
  const commonAPI = MachineLearningCommonAPIProvider(context);
  const commonUI = MachineLearningCommonUIProvider(context);

  const anomaliesTable = MachineLearningAnomaliesTableProvider(context);
  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context);
  const api = MachineLearningAPIProvider(context);
  const commonConfig = MachineLearningCommonConfigsProvider(context);
  const customUrls = MachineLearningCustomUrlsProvider(context);
  const dataFrameAnalytics = MachineLearningDataFrameAnalyticsProvider(context, api);
  const dataFrameAnalyticsCreation = MachineLearningDataFrameAnalyticsCreationProvider(
    context,
    commonUI,
    api
  );
  const dataFrameAnalyticsEdit = MachineLearningDataFrameAnalyticsEditProvider(context, commonUI);
  const dataFrameAnalyticsResults = MachineLearningDataFrameAnalyticsResultsProvider(context);
  const dataFrameAnalyticsTable = MachineLearningDataFrameAnalyticsTableProvider(context);
  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const dataVisualizerFileBased = MachineLearningDataVisualizerFileBasedProvider(context, commonUI);
  const dataVisualizerIndexBased = MachineLearningDataVisualizerIndexBasedProvider(
    context,
    commonUI
  );
  const jobManagement = MachineLearningJobManagementProvider(context, api);
  const jobSelection = MachineLearningJobSelectionProvider(context);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context);
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardAdvanced = MachineLearningJobWizardAdvancedProvider(context, commonUI);
  const jobWizardCategorization = MachineLearningJobWizardCategorizationProvider(context);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(context, commonUI, customUrls);
  const jobWizardMultiMetric = MachineLearningJobWizardMultiMetricProvider(context);
  const jobWizardPopulation = MachineLearningJobWizardPopulationProvider(context);
  const navigation = MachineLearningNavigationProvider(context);
  const overviewPage = MachineLearningOverviewPageProvider(context);
  const securityCommon = MachineLearningSecurityCommonProvider(context);
  const securityUI = MachineLearningSecurityUIProvider(context, securityCommon);
  const settings = MachineLearningSettingsProvider(context);
  const settingsCalendar = MachineLearningSettingsCalendarProvider(context, commonUI);
  const settingsFilterList = MachineLearningSettingsFilterListProvider(context, commonUI);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context, commonUI);
  const testExecution = MachineLearningTestExecutionProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context);

  return {
    anomaliesTable,
    anomalyExplorer,
    api,
    commonAPI,
    commonConfig,
    commonUI,
    customUrls,
    dataFrameAnalytics,
    dataFrameAnalyticsCreation,
    dataFrameAnalyticsEdit,
    dataFrameAnalyticsResults,
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
    overviewPage,
    securityCommon,
    securityUI,
    settings,
    settingsCalendar,
    settingsFilterList,
    singleMetricViewer,
    testExecution,
    testResources,
  };
}
