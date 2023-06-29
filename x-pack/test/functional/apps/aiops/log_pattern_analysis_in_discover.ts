/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');
  const browser = getService('browser');
  const retry = getService('retry');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const selectedField = '@message';
  const totalDocCount = 14005;

  async function retrySwitchTab(tabIndex: number, seconds: number) {
    await retry.tryForTime(seconds * 1000, async () => {
      await browser.switchTab(tabIndex);
    });
  }

  describe('log pattern analysis', async function () {
    let tabsCount = 1;

    afterEach(async () => {
      if (tabsCount > 1) {
        await browser.closeCurrentWindow();
        await retrySwitchTab(0, 10);
        tabsCount--;
      }
    });

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await ml.testResources.createIndexPatternIfNeeded('logstash-*', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('logstash-*');
    });

    it(`loads the log pattern analysis flyout and shows patterns in discover`, async () => {
      await ml.navigation.navigateToDiscoverViaAppsMenu();
      await PageObjects.timePicker.pauseAutoRefresh();
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 22, 2015 @ 23:50:13.253'
      );
      await PageObjects.discover.selectIndexPattern('logstash-*');
      await aiops.logPatternAnalysisPage.assertDiscoverDocCount(totalDocCount);

      await aiops.logPatternAnalysisPage.clickDiscoverField(selectedField);
      await aiops.logPatternAnalysisPage.clickDiscoverMenuAnalyzeButton(selectedField);

      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutExists();
      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutTitle(selectedField);

      await aiops.logPatternAnalysisPage.assertTotalCategoriesFound(3);
      await aiops.logPatternAnalysisPage.assertCategoryTableRows(3);

      // get category count from the first row
      const categoryCount = await aiops.logPatternAnalysisPage.getCategoryCountFromTable(0);
      await aiops.logPatternAnalysisPage.clickFilterInButton(0);

      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutDoesNotExist();

      await aiops.logPatternAnalysisPage.assertDiscoverDocCountExists();

      // ensure the discover doc count is equal to the category count
      await aiops.logPatternAnalysisPage.assertDiscoverDocCount(categoryCount);
    });

    it(`loads the log pattern analysis flyout and hides patterns in discover`, async () => {
      await ml.navigation.navigateToDiscoverViaAppsMenu();
      await PageObjects.timePicker.pauseAutoRefresh();
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 20, 2015 @ 00:00:00.000',
        'Sep 22, 2015 @ 23:50:13.253'
      );
      await aiops.logPatternAnalysisPage.assertDiscoverDocCount(totalDocCount);

      await aiops.logPatternAnalysisPage.clickDiscoverField(selectedField);
      await aiops.logPatternAnalysisPage.clickDiscoverMenuAnalyzeButton(selectedField);

      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutExists();
      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutTitle(selectedField);

      await aiops.logPatternAnalysisPage.assertTotalCategoriesFound(3);
      await aiops.logPatternAnalysisPage.assertCategoryTableRows(3);

      // get category count from the first row
      const categoryCount = await aiops.logPatternAnalysisPage.getCategoryCountFromTable(0);
      await aiops.logPatternAnalysisPage.clickFilterOutButton(0);

      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisFlyoutDoesNotExist();

      await aiops.logPatternAnalysisPage.assertDiscoverDocCountExists();

      // ensure the discover doc count is equal to the total count minus the category count
      await aiops.logPatternAnalysisPage.assertDiscoverDocCount(totalDocCount - categoryCount);
    });
  });
}
