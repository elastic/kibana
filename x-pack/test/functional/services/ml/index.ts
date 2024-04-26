/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { MachineLearningAnomaliesTableProvider } from './anomalies_table';
import { MachineLearningAnomalyExplorerProvider } from './anomaly_explorer';
import { MachineLearningAPIProvider } from './api';
import { MachineLearningCommonAPIProvider } from './common_api';
import { MachineLearningCommonConfigsProvider } from './common_config';
import { MachineLearningCommonUIProvider } from './common_ui';
import { MachineLearningCommonDataGridProvider } from './common_data_grid';
import { MachineLearningCustomUrlsProvider } from './custom_urls';
import { MachineLearningDataFrameAnalyticsProvider } from './data_frame_analytics';
import { MachineLearningDataFrameAnalyticsCreationProvider } from './data_frame_analytics_creation';
import { MachineLearningDataFrameAnalyticsEditProvider } from './data_frame_analytics_edit';
import { MachineLearningDataFrameAnalyticsResultsProvider } from './data_frame_analytics_results';
import { MachineLearningDataFrameAnalyticsMapProvider } from './data_frame_analytics_map';
import { MachineLearningDataFrameAnalyticsTableProvider } from './data_frame_analytics_table';
import { MachineLearningDataVisualizerProvider } from './data_visualizer';
import { MachineLearningDataVisualizerFileBasedProvider } from './data_visualizer_file_based';
import { MachineLearningDataVisualizerIndexBasedProvider } from './data_visualizer_index_based';
import { MachineLearningDataVisualizerIndexPatternManagementProvider } from './data_visualizer_index_pattern_management';
import { MachineLearningForecastProvider } from './forecast';
import { MachineLearningJobManagementProvider } from './job_management';
import { MachineLearningJobSelectionProvider } from './job_selection';
import { MachineLearningJobSourceSelectionProvider } from './job_source_selection';
import { MachineLearningJobTableProvider } from './job_table';
import { MachineLearningJobExpandedDetailsProvider } from './job_expanded_details';
import { MachineLearningJobTypeSelectionProvider } from './job_type_selection';
import { MachineLearningJobWizardAdvancedProvider } from './job_wizard_advanced';
import { MachineLearningJobWizardCommonProvider } from './job_wizard_common';
import { MachineLearningJobWizardCategorizationProvider } from './job_wizard_categorization';
import { MachineLearningJobWizardMultiMetricProvider } from './job_wizard_multi_metric';
import { MachineLearningJobWizardPopulationProvider } from './job_wizard_population';
import { MachineLearningJobWizardRecognizerProvider } from './job_wizard_recognizer';
import { MachineLearningJobWizardGeoProvider } from './job_wizard_geo';
import { MachineLearningLensVisualizationsProvider } from './lens_visualizations';
import { MachineLearningNavigationProvider } from './navigation';
import { MachineLearningOverviewPageProvider } from './overview_page';
import { MachineLearningSecurityCommonProvider } from './security_common';
import { MachineLearningSecurityUIProvider } from './security_ui';
import { MachineLearningSettingsProvider } from './settings';
import { MachineLearningSettingsCalendarProvider } from './settings_calendar';
import { MachineLearningSettingsFilterListProvider } from './settings_filter_list';
import { MachineLearningSingleMetricViewerProvider } from './single_metric_viewer';
import { MachineLearningStackManagementJobsProvider } from './stack_management_jobs';
import { MachineLearningTestExecutionProvider } from './test_execution';
import { MachineLearningTestResourcesProvider } from './test_resources';
import { MachineLearningDataVisualizerTableProvider } from './data_visualizer_table';
import { MachineLearningAlertingProvider } from './alerting';
import { SwimLaneProvider } from './swim_lane';
import { MachineLearningDashboardJobSelectionTableProvider } from './dashboard_job_selection_table';
import { MachineLearningDashboardEmbeddablesProvider } from './dashboard_embeddables';
import { TrainedModelsProvider } from './trained_models';
import { TrainedModelsTableProvider } from './trained_models_table';
import { DeployDFAModelFlyoutProvider } from './deploy_models_flyout';
import { MachineLearningJobAnnotationsProvider } from './job_annotations_table';
import { MlNodesPanelProvider } from './ml_nodes_list';
import { MachineLearningCasesProvider } from './cases';
import { AnomalyChartsProvider } from './anomaly_charts';
import { NotificationsProvider } from './notifications';
import { MlTableServiceProvider } from './common_table_service';
import { MachineLearningFieldStatsFlyoutProvider } from './field_stats_flyout';
import { MachineLearningDataDriftProvider } from './data_drift';
import { TrainedModelsFlyoutProvider } from './add_trained_models_flyout';
export function MachineLearningProvider(context: FtrProviderContext) {
  const commonAPI = MachineLearningCommonAPIProvider(context);
  const commonUI = MachineLearningCommonUIProvider(context);
  const commonDataGrid = MachineLearningCommonDataGridProvider(context);
  const commonFieldStatsFlyout = MachineLearningFieldStatsFlyoutProvider(context, commonUI);

  const anomaliesTable = MachineLearningAnomaliesTableProvider(context);
  const anomalyCharts = AnomalyChartsProvider(context);
  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context, anomalyCharts);
  const api = MachineLearningAPIProvider(context);
  const commonConfig = MachineLearningCommonConfigsProvider(context);
  const customUrls = MachineLearningCustomUrlsProvider(context);

  const dashboardJobSelectionTable = MachineLearningDashboardJobSelectionTableProvider(context);
  const dashboardEmbeddables = MachineLearningDashboardEmbeddablesProvider(
    context,
    dashboardJobSelectionTable
  );

  const dataDrift = MachineLearningDataDriftProvider(context);

  const dataFrameAnalytics = MachineLearningDataFrameAnalyticsProvider(context, api);
  const dataFrameAnalyticsCreation = MachineLearningDataFrameAnalyticsCreationProvider(
    context,
    commonUI,
    api,
    commonFieldStatsFlyout
  );
  const dataFrameAnalyticsEdit = MachineLearningDataFrameAnalyticsEditProvider(
    context,
    commonUI,
    customUrls
  );
  const dataFrameAnalyticsResults = MachineLearningDataFrameAnalyticsResultsProvider(
    context,
    commonUI,
    commonDataGrid
  );
  const dataFrameAnalyticsMap = MachineLearningDataFrameAnalyticsMapProvider(context);
  const dataFrameAnalyticsTable = MachineLearningDataFrameAnalyticsTableProvider(context);

  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const dataVisualizerTable = MachineLearningDataVisualizerTableProvider(context, commonUI);

  const dataVisualizerFileBased = MachineLearningDataVisualizerFileBasedProvider(context, commonUI);
  const dataVisualizerIndexBased = MachineLearningDataVisualizerIndexBasedProvider(context);
  const dataVisualizerIndexPatternManagement =
    MachineLearningDataVisualizerIndexPatternManagementProvider(context, dataVisualizerTable);

  const forecast = MachineLearningForecastProvider(context);
  const jobAnnotations = MachineLearningJobAnnotationsProvider(context);
  const jobManagement = MachineLearningJobManagementProvider(context, api);
  const jobSelection = MachineLearningJobSelectionProvider(context);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context, commonUI, customUrls);

  const jobExpandedDetails = MachineLearningJobExpandedDetailsProvider(
    context,
    jobTable,
    jobAnnotations
  );
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardAdvanced = MachineLearningJobWizardAdvancedProvider(context, commonUI);
  const jobWizardCategorization = MachineLearningJobWizardCategorizationProvider(
    context,
    commonFieldStatsFlyout
  );
  const jobWizardRecognizer = MachineLearningJobWizardRecognizerProvider(context, commonUI);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(
    context,
    commonUI,
    customUrls,
    commonFieldStatsFlyout
  );
  const jobWizardGeo = MachineLearningJobWizardGeoProvider(context);
  const jobWizardMultiMetric = MachineLearningJobWizardMultiMetricProvider(
    context,
    commonFieldStatsFlyout
  );
  const jobWizardPopulation = MachineLearningJobWizardPopulationProvider(
    context,
    commonFieldStatsFlyout
  );

  const lensVisualizations = MachineLearningLensVisualizationsProvider(context, commonUI);
  const navigation = MachineLearningNavigationProvider(context);
  const overviewPage = MachineLearningOverviewPageProvider(context);
  const securityCommon = MachineLearningSecurityCommonProvider(context);
  const securityUI = MachineLearningSecurityUIProvider(context, securityCommon);
  const settings = MachineLearningSettingsProvider(context);
  const settingsCalendar = MachineLearningSettingsCalendarProvider(context, commonUI);
  const settingsFilterList = MachineLearningSettingsFilterListProvider(context, commonUI);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context, commonUI);
  const stackManagementJobs = MachineLearningStackManagementJobsProvider(context);
  const tableService = MlTableServiceProvider(context);
  const testExecution = MachineLearningTestExecutionProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context, api);
  const alerting = MachineLearningAlertingProvider(context, api, commonUI);
  const swimLane = SwimLaneProvider(context);
  const trainedModels = TrainedModelsProvider(context, commonUI);
  const trainedModelsFlyout = TrainedModelsFlyoutProvider(context);
  const trainedModelsTable = TrainedModelsTableProvider(context, commonUI, trainedModels);
  const deployDFAModelFlyout = DeployDFAModelFlyoutProvider(context, commonUI);
  const mlNodesPanel = MlNodesPanelProvider(context);
  const notifications = NotificationsProvider(context, commonUI, tableService);

  const cases = MachineLearningCasesProvider(context, swimLane, anomalyCharts);

  return {
    anomaliesTable,
    anomalyCharts,
    anomalyExplorer,
    alerting,
    api,
    cases,
    commonAPI,
    commonConfig,
    commonDataGrid,
    commonFieldStatsFlyout,
    commonUI,
    customUrls,
    dashboardJobSelectionTable,
    dashboardEmbeddables,
    dataDrift,
    dataFrameAnalytics,
    dataFrameAnalyticsCreation,
    dataFrameAnalyticsEdit,
    dataFrameAnalyticsResults,
    dataFrameAnalyticsMap,
    dataFrameAnalyticsTable,
    dataVisualizer,
    dataVisualizerFileBased,
    dataVisualizerIndexBased,
    dataVisualizerIndexPatternManagement,
    dataVisualizerTable,
    forecast,
    jobAnnotations,
    jobExpandedDetails,
    jobManagement,
    jobSelection,
    jobSourceSelection,
    jobTable,
    jobTypeSelection,
    jobWizardAdvanced,
    jobWizardCategorization,
    jobWizardCommon,
    jobWizardGeo,
    jobWizardMultiMetric,
    jobWizardPopulation,
    jobWizardRecognizer,
    lensVisualizations,
    mlNodesPanel,
    navigation,
    notifications,
    overviewPage,
    securityCommon,
    securityUI,
    settings,
    settingsCalendar,
    settingsFilterList,
    singleMetricViewer,
    stackManagementJobs,
    swimLane,
    tableService,
    testExecution,
    testResources,
    trainedModels,
    trainedModelsFlyout,
    deployDFAModelFlyout,
    trainedModelsTable,
  };
}
