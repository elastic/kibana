/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function MachineLearningPageProvider({
  getPageObjects,
  getService,
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

    async getJobTable() {
      return await testSubjects.find('mlJobListTable');
    },

    async gettCreateNewJobButton() {
      return await testSubjects.find('mlCreateNewJobButton');
    },

    async gettJobStatsBar() {
      return await testSubjects.find('mlJobStatsBar');
    },

    async getAnomalyExplorerEmptyListMessage() {
      return await testSubjects.find('mlNoJobsFound');
    },

    async getSingleMetricViewerEmptyListMessage() {
      return await testSubjects.find('mlNoSingleMetricJobsFound');
    },

    async getDataFrameEmptyListMessage() {
      return await testSubjects.find('mlNoDataFrameJobsFound');
    },

    async getDataVisualizerImportDataCard() {
      return await testSubjects.find('mlDataVisualizerCardImportData');
    },

    async getDataVisualizerIndexDataCard() {
      return await testSubjects.find('mlDataVisualizerCardIndexData');
    },

    async gettSettingsCalendarLink() {
      return await testSubjects.find('ml_calendar_mng_button');
    },

    async gettSettingsFilterlistLink() {
      return await testSubjects.find('ml_filter_lists_button');
    },
  };
}
