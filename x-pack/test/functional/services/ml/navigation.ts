/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const appsMenu = getService('appsMenu');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  return {
    async navigateToMl() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('ml');
        await testSubjects.existOrFail('mlApp', { timeout: 2000 });
      });
    },

    async navigateToMlViaAppsMenu() {
      await retry.tryForTime(60 * 1000, async () => {
        await appsMenu.clickLink('Machine Learning');
        await testSubjects.existOrFail('mlApp', { timeout: 2000 });
      });
    },

    async navigateToStackManagement({ expectMlLink = true }: { expectMlLink?: boolean } = {}) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('management');
        if (expectMlLink) {
          await testSubjects.existOrFail('jobsListLink', { timeout: 2000 });
        } else {
          await testSubjects.missingOrFail('jobsListLink', { timeout: 2000 });
        }
      });
    },

    async navigateToStackManagementViaAppsMenu() {
      await retry.tryForTime(60 * 1000, async () => {
        await appsMenu.clickLink('Stack Management');
        await testSubjects.existOrFail('jobsListLink', { timeout: 2000 });
      });
    },

    async navigateToAlertsAndAction() {
      await PageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
      await testSubjects.existOrFail('rulesList');
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

    async assertTabEnabled(tabSubject: string, expectedValue: boolean) {
      await retry.tryForTime(10000, async () => {
        const isEnabled = await testSubjects.isEnabled(tabSubject);
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected ML tab '${tabSubject}' to be '${
            expectedValue ? 'enabled' : 'disabled'
          }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
        );
      });
    },

    async assertOverviewTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~overview', expectedValue);
    },

    async assertAnomalyDetectionTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~anomalyDetection', expectedValue);
    },

    async assertAnomalyExplorerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~anomalyExplorer', expectedValue);
    },

    async assertSingleMetricViewerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~singleMetricViewer', expectedValue);
    },

    async assertDataFrameAnalyticsTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~dataFrameAnalytics', expectedValue);
    },

    async assertTrainedModelsNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~trainedModels', expectedValue);
    },

    async assertNodesNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~nodesOverview', expectedValue);
    },

    async assertDataVisualizerTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~dataVisualizer', expectedValue);
    },

    async assertFileDataVisualizerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~fileDataVisualizer', expectedValue);
    },

    async assertIndexDataVisualizerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~indexDataVisualizer', expectedValue);
    },

    async assertSettingsTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~settings', expectedValue);
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

    async navigateToTrainedModels() {
      await this.navigateToMl();
      await this.navigateToArea('~mlMainTab & ~trainedModels', 'mlModelsTableContainer');
    },

    async navigateToModelManagementNodeList() {
      await this.navigateToMl();
      await this.navigateToArea('~mlMainTab & ~nodesOverview', 'mlNodesTableContainer');
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

    async navigateToStackManagementInsuficientLicensePage() {
      // clicks the jobsListLink and loads the jobs list page
      await testSubjects.click('jobsListLink');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the overall page is present
        await testSubjects.existOrFail('mlPageInsufficientLicense');
      });
    },

    async navigateToStackManagementJobsListPageAnomalyDetectionTab() {
      // clicks the `Analytics` tab and loads the analytics list page
      await testSubjects.click('mlStackManagementJobsListAnomalyDetectionTab');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the empty prompt for analytics jobs list got loaded
        await testSubjects.existOrFail('ml-jobs-list');
      });
    },

    async navigateToStackManagementJobsListPageAnalyticsTab() {
      // clicks the `Analytics` tab and loads the analytics list page
      await testSubjects.click('mlStackManagementJobsListAnalyticsTab');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the empty prompt for analytics jobs list got loaded
        await testSubjects.existOrFail('mlAnalyticsJobList');
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
      // clicks the `Single Metric Viewer` icon on the button group to switch result views
      await testSubjects.click('mlAnomalyResultsViewSelectorSingleMetricViewer');
      await retry.tryForTime(60 * 1000, async () => {
        // verify that the single metric viewer page is visible
        await testSubjects.existOrFail('mlPageSingleMetricViewer');
      });
    },

    async openKibanaNav() {
      if (!(await testSubjects.exists('collapsibleNav'))) {
        await testSubjects.click('toggleNavButton');
      }
      await testSubjects.existOrFail('collapsibleNav');
    },

    async closeKibanaNav() {
      if (await testSubjects.exists('collapsibleNav')) {
        await testSubjects.click('toggleNavButton');
      }
      await testSubjects.missingOrFail('collapsibleNav');
    },

    async assertKibanaNavMLEntryExists() {
      const navArea = await testSubjects.find('collapsibleNav');
      const mlNavLink = await navArea.findAllByCssSelector('[title="Machine Learning"]');
      if (mlNavLink.length === 0) {
        throw new Error(`expected ML link in nav menu to exist`);
      }
    },

    async assertKibanaNavMLEntryNotExists() {
      const navArea = await testSubjects.find('collapsibleNav');
      const mlNavLink = await navArea.findAllByCssSelector('[title="Machine Learning"]');
      if (mlNavLink.length !== 0) {
        throw new Error(`expected ML link in nav menu to not exist`);
      }
    },

    async navigateToKibanaHome() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('home');
        await testSubjects.existOrFail('homeApp', { timeout: 2000 });
      });
    },

    /**
     * Assert the active URL.
     * @param expectedUrlPart - URL component excluding host
     */
    async assertCurrentURLContains(expectedUrlPart: string) {
      const currentUrl = await browser.getCurrentUrl();
      expect(currentUrl).to.include.string(
        expectedUrlPart,
        `Expected the current URL "${currentUrl}" to include ${expectedUrlPart}`
      );
    },

    async assertCurrentURLNotContain(expectedUrlPart: string) {
      const currentUrl = await browser.getCurrentUrl();
      expect(currentUrl).to.not.include.string(
        expectedUrlPart,
        `Expected the current URL "${currentUrl}" to not include ${expectedUrlPart}`
      );
    },

    async browserBackTo(backTestSubj: string) {
      await browser.goBack();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail(backTestSubj, { timeout: 10 * 1000 });
    },
  };
}
