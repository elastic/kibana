/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData } from './types';
import { farequoteDataViewTestData } from '../data_visualizer/index_test_data';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const headerPage = getPageObject('header');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in explain log rate spikes`, async () => {
      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await ml.aiops.navigateToIndexPatternSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the explain log rate spikes page`
      );
      await ml.jobSourceSelection.selectSourceForExplainLogRateSpikes(
        testData.sourceIndexOrSavedSearch
      );
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await ml.aiops.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.aiops.clickUseFullDataButton(testData.expected.totalDocCountFormatted);
      await headerPage.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await ml.aiops.assertTotalDocCountHeaderExist();
      await ml.aiops.assertTotalDocCountChartExist();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );

      await ml.aiops.assertSearchPanelExist();

      await ml.testExecution.logTestStep('displays empty prompt');
      await ml.aiops.assertNoWindowParametersEmptyPromptExist();
    });
  }

  describe('index based', function () {
    this.tags(['ml']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    describe('with farequote', function () {
      // Run tests on full farequote index.
      it(`${farequoteDataViewTestData.suiteTitle} loads the explain log rate spikes page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteDataViewTestData);
    });
  });
}
