/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  farequoteKQLFiltersSearchTestData,
  farequoteLuceneFiltersSearchTestData,
  farequoteDataViewTestData,
} from './index_test_data';
import { TestData } from './types';

const PINNED_FILTER = {
  key: 'type.keyword',
  value: 'farequote',
  enabled: true,
  pinned: true,
  negated: false,
};
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings', 'header']);
  const filterBar = getService('filterBar');

  const startTime = 'Jan 1, 2016 @ 00:00:00.000';
  const endTime = 'Nov 1, 2020 @ 00:00:00.000';

  function runTests(testData: TestData) {
    afterEach(async function () {
      await filterBar.removeFilter(PINNED_FILTER.key);
    });

    it(`retains pinned filters from other plugins`, async () => {
      await ml.navigation.navigateToDiscoverViaAppsMenu();

      await dataViews.switchToAndValidate('ft_farequote');
      await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);

      await filterBar.addFilter({
        field: PINNED_FILTER.key,
        operation: 'is',
        value: PINNED_FILTER.value,
      });
      await filterBar.toggleFilterPinned(PINNED_FILTER.key);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} navigates to ML`);
      await ml.navigation.navigateToMlViaAppsMenu();
      await ml.navigation.navigateToDataVisualizer();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await ml.dataVisualizer.navigateToDataViewSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the index data visualizer page`
      );
      await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
        testData.sourceIndexOrSavedSearch
      );

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.dataVisualizerIndexBased.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );

      if (Array.isArray(testData.expected?.filters)) {
        await PageObjects.header.waitUntilLoadingHasFinished();
        for (const filter of testData.expected?.filters) {
          await ml.dataVisualizerIndexBased.assertFilterBarFilterContent({
            key: filter.key,
            value: filter.value,
            enabled: true,
            pinned: false,
            negated: false,
          });
        }
      }

      await ml.dataVisualizerIndexBased.assertFilterBarFilterContent(PINNED_FILTER);
    });

    it(`retains pinned filters to other plugins`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} navigates to ML`);
      await ml.navigation.navigateToDataVisualizer();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await ml.dataVisualizer.navigateToDataViewSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the index data visualizer page`
      );
      await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
        testData.sourceIndexOrSavedSearch
      );

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.dataVisualizerIndexBased.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );
      await PageObjects.header.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} adds a pinned filter`);
      await filterBar.addFilter({
        field: PINNED_FILTER.key,
        operation: 'is',
        value: PINNED_FILTER.value,
      });
      await filterBar.toggleFilterPinned(PINNED_FILTER.key);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} navigates to Discover`);
      await ml.navigation.navigateToDiscoverViaAppsMenu();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await ml.dataVisualizerIndexBased.assertFilterBarFilterContent(PINNED_FILTER);
    });
  }
  describe('data visualizer with pinned global filters', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async function () {
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    describe(`with ${farequoteDataViewTestData.suiteTitle}`, function () {
      runTests(farequoteDataViewTestData);
    });

    describe(`with ${farequoteLuceneFiltersSearchTestData.suiteTitle}`, function () {
      runTests(farequoteLuceneFiltersSearchTestData);
    });
    describe(`with ${farequoteKQLFiltersSearchTestData.suiteTitle}`, function () {
      runTests(farequoteKQLFiltersSearchTestData);
    });
  });
}
