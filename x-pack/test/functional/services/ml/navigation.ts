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
  const PageObjects = getPageObjects(['common', 'header', 'discover']);
  const managementMenu = getService('managementMenu');

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

    async navigateToStackManagementMlSection(
      sectionId: string,
      pageSubject: string,
      spaceId?: string
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        if (spaceId) {
          await PageObjects.common.navigateToApp('management', { basePath: `/s/${spaceId}` });
        } else {
          await PageObjects.common.navigateToApp('management');
        }

        const sections = await managementMenu.getSections();
        const mlSection = sections.find((section) => section.sectionId === 'ml');
        expect(mlSection).to.not.be(undefined);
        expect(mlSection?.sectionLinks).to.contain(
          sectionId,
          `Expected Stack Management ML to have section ${sectionId}`
        );
        await testSubjects.click(sectionId);
        await testSubjects.existOrFail(pageSubject, { timeout: 2000 });
      });
    },

    async assertStackManagementMlSectionNotExist() {
      await PageObjects.common.navigateToApp('management');
      await testSubjects.missingOrFail('ml');
    },

    async navigateToDiscoverViaAppsMenu() {
      await retry.tryForTime(60 * 1000, async () => {
        await appsMenu.clickLink('Discover');
        await PageObjects.discover.waitForDiscoverAppOnScreen();
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

    async assertAnomalyDetectionTabsEnabled(expectedValue: boolean) {
      await this.assertAnomalyExplorerNavItemEnabled(expectedValue);
      await this.assertSingleMetricViewerNavItemEnabled(expectedValue);
    },

    async assertAnomalyExplorerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~anomalyExplorer', expectedValue);
    },

    async assertSingleMetricViewerNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~singleMetricViewer', expectedValue);
    },

    async assertDataFrameAnalyticsTabsEnabled(expectedValue: boolean) {
      await this.assertDataFrameAnalyticsResultsExplorerTabEnabled(expectedValue);
      await this.assertDataFrameAnalyticsMapTabEnabled(expectedValue);
    },

    async assertDataFrameAnalyticsResultsExplorerTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~dataFrameAnalyticsResultsExplorer', expectedValue);
    },

    async assertDataFrameAnalyticsMapTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~dataFrameAnalyticsMap', expectedValue);
    },

    async assertAnomalyDetectionNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('anomaly_detection', expectedValue);
    },

    async assertDataFrameAnalyticsNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('analytics', expectedValue);
    },

    async assertTrainedModelsNavItemEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('trained_models', expectedValue);
    },

    async assertDataVisualizerTabEnabled(expectedValue: boolean) {
      await this.assertTabEnabled('~mlMainTab & ~dataVisualizer', expectedValue);
    },

    async assertADSettingsTabExists(shouldExist: boolean) {
      if (shouldExist) {
        await testSubjects.existOrFail('ad_settings');
      } else {
        await testSubjects.missingOrFail('ad_settings');
      }
    },

    async navigateToStackManagement({ expectMlLink = true }: { expectMlLink?: boolean } = {}) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('management');
        if (expectMlLink) {
          await testSubjects.existOrFail('anomaly_detection', { timeout: 2000 });
        } else {
          await testSubjects.missingOrFail('anomaly_detection', { timeout: 2000 });
        }
      });
    },

    async navigateToOverview() {
      await this.navigateToArea('~mlMainTab & ~overview', 'mlAppPageOverview');
    },

    async navigateToOverviewTab() {
      await testSubjects.click('mlManagementOverviewPageTabs overview');
    },

    async navigateToNotifications() {
      await this.navigateToStackManagementMlSection('overview', 'mlStackManagementOverviewPage');
      await testSubjects.click('mlManagementOverviewPageTabs notifications');
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.existOrFail('mlNotificationsTable loaded');
      });
    },

    async navigateToMemoryUsageManagement() {
      await this.navigateToStackManagementMlSection('overview', 'mlStackManagementOverviewPage');
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.click('mlManagementOverviewPageTabs overview');
        await testSubjects.existOrFail('mlMemoryUsagePanel');
      });
    },

    async navigateToNotificationsTab() {
      await this.navigateToStackManagementMlSection('overview', 'mlStackManagementOverviewPage');
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.click('mlManagementOverviewPageTabs notifications');
        await testSubjects.existOrFail('mlNotificationsTable loaded');
      });
    },

    async navigateToAnomalyDetection() {
      await this.navigateToArea('~mlMainTab & ~anomalyDetection', 'mlPageJobManagement');
    },

    async navigateToAnomalyExplorerWithSideNav() {
      await this.navigateToArea('~mlMainTab & ~anomalyExplorer', 'mlAnomalyDetectionEmptyState');
    },

    async navigateToSingleMetricViewerWithSideNav() {
      await this.navigateToArea('~mlMainTab & ~singleMetricViewer', 'mlNoSingleMetricJobsFound');
    },

    async navigateToDfaMapWithSideNav() {
      await this.navigateToArea(
        '~mlMainTab & ~dataFrameAnalyticsMap',
        'mlNoDataFrameAnalyticsFound'
      );
    },

    async navigateToDfaResultsExplorerWithSideNav() {
      await this.navigateToArea(
        '~mlMainTab & ~dataFrameAnalyticsResultsExplorer',
        'mlNoDataFrameAnalyticsFound'
      );
    },

    async navigateToAnomalyExplorer(
      jobId: string,
      timeRange: { from: string; to: string },
      callback?: () => Promise<void>
    ) {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'ml',
        `/explorer`,
        `?_g=(ml%3A(jobIds%3A!(${jobId}))%2CrefreshInterval%3A(display%3AOff%2Cpause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3A'${timeRange.from}'%2Cto%3A'${timeRange.to}'))`
      );
      if (callback) {
        await callback();
      }
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async navigateToSingleMetricViewer(jobId: string) {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'ml',
        `/timeseriesexplorer`,
        `?_g=(ml%3A(jobIds%3A!(${jobId}))%2CrefreshInterval%3A(display%3AOff%2Cpause%3A!t%2Cvalue%3A0))`
      );
    },

    async navigateToDataFrameAnalytics(spaceId?: string) {
      await this.navigateToStackManagementMlSection('analytics', 'mlAnalyticsJobList', spaceId);
    },

    async navigateToTrainedModels(spaceId?: string) {
      await this.navigateToStackManagementMlSection(
        'trained_models',
        'mlModelsTableContainer',
        spaceId
      );
    },

    async navigateToModelManagementNodeList() {
      await this.navigateToMl();
      await this.navigateToArea('~mlMainTab & ~nodesOverview', 'mlNodesTableContainer');
    },

    async navigateToDataVisualizer() {
      await this.navigateToMl();
      await this.navigateToArea('~mlMainTab & ~dataVisualizer', 'mlPageDataVisualizerSelector');
    },

    async navigateToDataVisualizerFromAppsMenu() {
      await this.navigateToMlViaAppsMenu();
      await this.navigateToArea('~mlMainTab & ~dataVisualizer', 'mlPageDataVisualizerSelector');
    },

    async navigateToDataESQLDataVisualizer() {
      await testSubjects.click('mlDataVisualizerSelectESQLButton');
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('dataVisualizerIndexPage');
      });
    },

    async navigateToDataDrift() {
      await testSubjects.click('mlDataVisualizerSelectDataDriftButton');
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('mlPageDataDrift');
      });
    },

    async navigateToSuppliedConfigurations() {
      await this.navigateToStackManagementMlSection('anomaly_detection', 'ml-jobs-list');

      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('mlSuppliedConfigurationsButton');

        await testSubjects.click('mlSuppliedConfigurationsButton');
        await testSubjects.existOrFail('mlPageSuppliedConfigurations');
      });
    },

    async navigateToJobManagement(spaceId?: string) {
      await this.navigateToStackManagementMlSection('anomaly_detection', 'ml-jobs-list', spaceId);
    },

    async navigateToADSettings(spaceId?: string) {
      await this.navigateToJobManagement(spaceId);
      await testSubjects.existOrFail('mlAnomalyDetectionSettingsButton');
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.click('mlAnomalyDetectionSettingsButton');
        await testSubjects.existOrFail('mlPageSettings');
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
