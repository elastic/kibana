/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function MachineLearningProvider({
  getService,
  getPageObjects,
}: KibanaFunctionalTestDefaultProviders) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateTo() {
      return await PageObjects.common.navigateToApp('ml');
    },

    async navigateToJobManagement() {
      await testSubjects.click('mlTabJobManagement');
      await testSubjects.exists('mlPageJobManagement');
    },

    async navigateToAnomalyExplorert() {
      await testSubjects.click('mlTabAnomalyExplorer');
      await testSubjects.exists('mlPageAnomalyExplorer');
    },

    async navigateToSingleMetricViewer() {
      await testSubjects.click('mlTabSingleMetricViewer');
      await testSubjects.exists('mlPageSingleMetricViewer');
    },

    async navigateToDataFrames() {
      await testSubjects.click('mlTabDataFrames');
      await testSubjects.exists('mlPageDataFrame');
    },

    async navigateToDataVisualizer() {
      await testSubjects.click('mlTabDataVisualizer');
      await testSubjects.exists('mlPageDataVisualizerSelector');
    },

    async navigateToSettings() {
      await testSubjects.click('mlTabSettings');
      await testSubjects.exists('mlPageSettings');
    },

    async assertJobTableExists() {
      await testSubjects.existOrFail('mlJobListTable');
    },

    async assertCreateNewJobButtonExists() {
      await testSubjects.existOrFail('mlCreateNewJobButton');
    },

    async assertJobStatsBarExists() {
      await testSubjects.existOrFail('mlJobStatsBar');
    },

    async assertAnomalyExplorerEmptyListMessageExists() {
      await testSubjects.existOrFail('mlNoJobsFound');
    },

    async assertSingleMetricViewerEmptyListMessageExsist() {
      await testSubjects.existOrFail('mlNoSingleMetricJobsFound');
    },

    async assertDataFrameEmptyListMessageExists() {
      await testSubjects.existOrFail('mlNoDataFrameJobsFound');
    },

    async assertDataVisualizerImportDataCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardImportData');
    },

    async assertDataVisualizerIndexDataCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardIndexData');
    },

    async assertSettingsCalendarLinkExists() {
      await testSubjects.existOrFail('ml_calendar_mng_button');
    },

    async assertSettingsFilterlistLinkExists() {
      await testSubjects.existOrFail('ml_filter_lists_button');
    },
  };
}
