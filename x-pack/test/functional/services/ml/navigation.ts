/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateToMl() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('ml');
        await testSubjects.existOrFail('mlPageOverview', { timeout: 2000 });
      });
    },

    async navigateToStackManagement() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('management');
        await testSubjects.existOrFail('jobsListLink', { timeout: 2000 });
      });
    },

    async assertTabsExist(tabTypeSubject: string, areaSubjects: string[]) {
      await retry.tryForTime(10000, async () => {
        const allTabs = await testSubjects.findAll(`~${tabTypeSubject}`, 3);
        expect(allTabs).to.have.length(
          areaSubjects.length,
          `Expected number of '${tabTypeSubject}' to be '${areaSubjects.length}' (got '${allTabs.length}')`
        );
        for (const areaSubj of areaSubjects) {
          await testSubjects.existOrFail(`~${tabTypeSubject}&~${areaSubj}`, { timeout: 1000 });
        }
      });
    },

    async navigateToArea(linkSubject: string, pageSubject: string) {
      await testSubjects.click(linkSubject);
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`${linkSubject} & ~selected`);
        await testSubjects.existOrFail(pageSubject);
      });
    },

    async assertMainTabsExist() {
      await this.assertTabsExist('mlMainTab', [
        'anomalyDetection',
        'dataFrames',
        'dataFrameAnalytics',
        'dataVisualizer',
      ]);
    },

    async navigateToOverview() {
      await this.navigateToArea('~mlMainTab & ~overview', 'mlPageOverview');
    },

    async navigateToAnomalyDetection() {
      await this.navigateToArea('~mlMainTab & ~anomalyDetection', 'mlPageJobManagement');
    },

    async navigateToDataFrameAnalytics() {
      await this.navigateToArea('~mlMainTab & ~dataFrameAnalytics', 'mlPageDataFrameAnalytics');
    },

    async navigateToDataVisualizer() {
      await this.navigateToArea('~mlMainTab & ~dataVisualizer', 'mlPageDataVisualizerSelector');
    },

    async navigateToJobManagement() {
      await this.navigateToAnomalyDetection();
    },

    async navigateToSettings() {
      await this.navigateToArea('~mlMainTab & ~settings', 'mlPageSettings');
    },

    async navigateToStackManagementJobsListPage() {
      // clicks the jobsListLink and loads the jobs list page
      await testSubjects.click('jobsListLink');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the overall page is present
        await testSubjects.existOrFail('mlPageStackManagementJobsList');
        // verify that the default tab with the anomaly detection jobs list got loaded
        await testSubjects.existOrFail('ml-jobs-list');
      });
    },

    async navigateToStackManagementJobsListPageAnalyticsTab() {
      // clicks the `Analytics` tab and loads the analytics list page
      await testSubjects.click('mlStackManagementJobsListAnalyticsTab');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the empty prompt for analytics jobs list got loaded
        await testSubjects.existOrFail('mlNoDataFrameAnalyticsFound');
      });
    },

    async navigateToAnomalyExplorerViaSingleMetricViewer() {
      // clicks the `Anomaly Explorer` icon on the button group to switch result views
      await testSubjects.click('mlAnomalyResultsViewSelectorExplorer');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the anomaly explorer page is visible
        await testSubjects.existOrFail('mlPageAnomalyExplorer');
      });
    },

    async navigateToSingleMetricViewerViaAnomalyExplorer() {
      // clicks the `Single Metric Viewere` icon on the button group to switch result views
      await testSubjects.click('mlAnomalyResultsViewSelectorSingleMetricViewer');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the single metric viewer page is visible
        await testSubjects.existOrFail('mlPageSingleMetricViewer');
      });
    },
  };
}
