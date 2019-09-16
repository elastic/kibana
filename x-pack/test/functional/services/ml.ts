/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import {
  MachineLearningAnomalyExplorerProvider,
  MachineLearningAPIProvider,
  MachineLearningDataFramesProvider,
  MachineLearningDataVisualizerProvider,
  MachineLearningJobManagementProvider,
  MachineLearningJobSourceSelectionProvider,
  MachineLearningJobTableProvider,
  MachineLearningJobTypeSelectionProvider,
  MachineLearningJobWizardCommonProvider,
  MachineLearningNavigationProvider,
  MachineLearningSettingsProvider,
  MachineLearningSingleMetricViewerProvider,
} from './machine_learning';

export function MachineLearningProvider(context: FtrProviderContext) {
  const anomalyExplorer = MachineLearningAnomalyExplorerProvider(context);
  const api = MachineLearningAPIProvider(context);
  const dataFrames = MachineLearningDataFramesProvider(context);
  const dataVisualizer = MachineLearningDataVisualizerProvider(context);
  const jobManagement = MachineLearningJobManagementProvider(context);
  const jobSourceSelection = MachineLearningJobSourceSelectionProvider(context);
  const jobTable = MachineLearningJobTableProvider(context);
  const jobTypeSelection = MachineLearningJobTypeSelectionProvider(context);
  const jobWizardCommon = MachineLearningJobWizardCommonProvider(context);
  const navigation = MachineLearningNavigationProvider(context);
  const settings = MachineLearningSettingsProvider(context);
  const singleMetricViewer = MachineLearningSingleMetricViewerProvider(context);

  return {
    anomalyExplorer,
    api,
    dataFrames,
    dataVisualizer,
    jobManagement,
    jobSourceSelection,
    jobTable,
    jobTypeSelection,
    jobWizardCommon,
    navigation,
    settings,
    singleMetricViewer,
  };
}
