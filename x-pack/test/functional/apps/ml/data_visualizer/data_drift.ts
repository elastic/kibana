/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { farequoteDataViewTestDataWithQuery } from '../../aiops/log_rate_analysis_test_data';
import { TestData } from '../../aiops/types';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in data drift`, async () => {
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await ml.navigation.navigateToDataDrift();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the data drift index or saved search select page`
      );
      await ml.jobSourceSelection.selectSourceForDataDrift(testData.sourceIndexOrSavedSearch);
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await ml.dataDrift.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.dataDrift.clickUseFullDataButton();

      await ml.dataDrift.setRandomSamplingOption('Reference', 'dvRandomSamplerOptionOff');
      await ml.dataDrift.setRandomSamplingOption('Comparison', 'dvRandomSamplerOptionOff');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await ml.dataDrift.assertPrimarySearchBarExists();
      await ml.dataDrift.assertReferenceDocCountContent();
      await ml.dataDrift.assertComparisonDocCountContent();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the page correctly`
      );
      await ml.dataDrift.assertNoWindowParametersEmptyPromptExists();

      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');
      await ml.dataDrift.clickDocumentCountChart(
        'dataDriftDocCountChart-Reference',
        testData.chartClickCoordinates
      );
      await ml.dataDrift.runAnalysis();
    });
  }

  describe('data drift', async function () {
    for (const testData of [farequoteDataViewTestDataWithQuery]) {
      describe(`with '${testData.sourceIndexOrSavedSearch}'`, function () {
        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

          await ml.testResources.createIndexPatternIfNeeded(
            testData.sourceIndexOrSavedSearch,
            '@timestamp'
          );

          await ml.testResources.setKibanaTimeZoneToUTC();

          if (testData.dataGenerator === 'kibana_sample_data_logs') {
            await PageObjects.security.login('elastic', 'changeme', {
              expectSuccess: true,
            });

            await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
              useActualUrl: true,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            await PageObjects.home.addSampleDataSet('logs');
            await PageObjects.header.waitUntilLoadingHasFinished();
          } else {
            await ml.securityUI.loginAsMlPowerUser();
          }
        });

        after(async () => {
          await elasticChart.setNewChartUiDebugFlag(false);
          await ml.testResources.deleteIndexPatternByTitle(testData.sourceIndexOrSavedSearch);
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
        });

        it(`${testData.suiteTitle} loads the ml page`, async () => {
          // Start navigation from the base of the ML app.
          await ml.navigation.navigateToMl();
          await elasticChart.setNewChartUiDebugFlag(true);
        });

        runTests(testData);
      });
    }
  });
}
