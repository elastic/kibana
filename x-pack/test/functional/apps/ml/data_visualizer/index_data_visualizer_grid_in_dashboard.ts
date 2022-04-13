/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData, MetricFieldVisConfig } from './types';
import { farequoteLuceneFiltersSearchTestData } from './index_test_data';

const SHOW_FIELD_STATISTICS = 'discover:showFieldStatistics';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'settings',
    'dashboard',
    'header',
  ]);
  const ml = getService('ml');
  const retry = getService('retry');
  const dashboardAddPanel = getService('dashboardAddPanel');

  function runTests(testData: TestData) {
    const savedSearchTitle = `Field stats for ${testData.suiteTitle} ${Date.now()}`;
    const dashboardTitle = `Dashboard for ${testData.suiteTitle} ${Date.now()}`;
    const startTime = 'Jan 1, 2016 @ 00:00:00.000';
    const endTime = 'Nov 1, 2020 @ 00:00:00.000';

    describe(`with ${testData.suiteTitle}`, function () {
      after(async function () {
        await ml.testResources.deleteSavedSearchByTitle(savedSearchTitle);
        await ml.testResources.deleteDashboardByTitle(dashboardTitle);
      });

      it(`saves search with Field statistics table in Discover`, async function () {
        await ml.testResources.setAdvancedSettingProperty(SHOW_FIELD_STATISTICS, true);

        await PageObjects.common.navigateToApp('discover');
        if (testData.isSavedSearch) {
          await retry.tryForTime(2 * 1000, async () => {
            await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
          });
        } else {
          await ml.dashboardEmbeddables.selectDiscoverIndexPattern(
            testData.sourceIndexOrSavedSearch
          );
        }
        await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);

        await PageObjects.discover.assertViewModeToggleExists();
        await PageObjects.discover.clickViewModeFieldStatsButton();
        await ml.testExecution.logTestStep('saves as new search');
        await PageObjects.discover.saveSearch(savedSearchTitle, true);
      });

      it(`displays Field statistics table in Dashboard when enabled`, async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await dashboardAddPanel.addSavedSearch(savedSearchTitle);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);
        await PageObjects.header.waitUntilLoadingHasFinished();

        for (const fieldRow of testData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await ml.dataVisualizerTable.assertNumberFieldContents(
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.topValuesCount,
            fieldRow.viewableInLens
          );
        }

        for (const fieldRow of testData.expected.nonMetricFields!) {
          await ml.dataVisualizerTable.assertNonMetricFieldContents(
            fieldRow.type,
            fieldRow.fieldName!,
            fieldRow.docCountFormatted,
            fieldRow.exampleCount,
            fieldRow.viewableInLens,
            false,
            fieldRow.exampleContent
          );
        }

        await PageObjects.dashboard.saveDashboard(dashboardTitle);
      });

      it(`doesn't display Field statistics table in Dashboard when disabled`, async function () {
        await ml.testResources.setAdvancedSettingProperty(SHOW_FIELD_STATISTICS, false);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardTitle);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dashboardAddPanel.addSavedSearch(savedSearchTitle);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.discover.assertFieldStatsTableNotExists();
        await PageObjects.dashboard.saveDashboard(dashboardTitle);
      });
    });
  }

  describe('field statistics in Dashboard', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async function () {
      await ml.testResources.clearAdvancedSettingProperty(SHOW_FIELD_STATISTICS);
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    runTests(farequoteLuceneFiltersSearchTestData);
  });
}
