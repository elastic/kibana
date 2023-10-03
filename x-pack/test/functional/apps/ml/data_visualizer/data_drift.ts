/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export interface TestData {
  suiteTitle: string;
  dateTimeField: string;
  isSavedSearch?: boolean;
  sourceIndexOrSavedSearch: string;
  chartClickCoordinates: [number, number];
}
export const farequoteKQLFiltersSearchTestData: TestData = {
  suiteTitle: 'KQL saved search and filters',
  isSavedSearch: true,
  dateTimeField: '@timestamp',
  sourceIndexOrSavedSearch: 'ft_farequote_filter_and_kuery',
  chartClickCoordinates: [0, 0],
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');

  async function assertDataDriftPageContent(testData) {
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
  }
  describe('data drift', async function () {
    before(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_fare*');
      await ml.testResources.deleteIndexPatternByTitle('ft_fare*,ft_fareq*');
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_fare*');
      await ml.testResources.deleteIndexPatternByTitle('ft_fare*,ft_fareq*');
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
    });

    describe('with ft_farequote_filter_and_kuery from index selection page', async function () {
      after(async () => {
        await elasticChart.setNewChartUiDebugFlag(false);
      });

      it(`${farequoteKQLFiltersSearchTestData.suiteTitle} loads the ml page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      it(`${farequoteKQLFiltersSearchTestData.suiteTitle} loads the source data in data drift`, async () => {
        await ml.testExecution.logTestStep(
          `${farequoteKQLFiltersSearchTestData.suiteTitle} loads the data drift index or saved search select page`
        );
        await ml.navigation.navigateToDataDrift();

        await ml.testExecution.logTestStep(
          `${farequoteKQLFiltersSearchTestData.suiteTitle} loads the data drift view`
        );
        await ml.jobSourceSelection.selectSourceForDataDrift(
          farequoteKQLFiltersSearchTestData.sourceIndexOrSavedSearch
        );
        await assertDataDriftPageContent(farequoteKQLFiltersSearchTestData);
      });
    });

    const testData: TestData = {
      suiteTitle: 'from data view creation mode',
      isSavedSearch: true,
      dateTimeField: '@timestamp',
      sourceIndexOrSavedSearch: 'ft_farequote_filter_and_kuery',
      chartClickCoordinates: [0, 0],
    };

    describe(testData.suiteTitle, function () {
      it(`${testData.suiteTitle} loads the ml page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      it(`${testData.suiteTitle} allows analyzing data drift without setting time field`, async () => {
        await ml.testExecution.logTestStep(
          `${testData.suiteTitle} loads the saved search selection page`
        );
        await ml.navigation.navigateToDataDrift();

        await ml.testExecution.logTestStep(`${testData.suiteTitle} creates new data view`);
        await ml.dataDrift.navigateToCreateNewDataViewPage();
        await ml.dataDrift.assertIndexPatternNotEmptyFormErrorExists('reference');
        await ml.dataDrift.assertIndexPatternNotEmptyFormErrorExists('comparison');
        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(true);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(true);

        await ml.testExecution.logTestStep(`${testData.suiteTitle} sets index patterns`);
        await ml.dataDrift.setIndexPatternInput('reference', 'ft_fare*');
        await ml.dataDrift.setIndexPatternInput('comparison', 'ft_fareq*');

        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(false);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(false);

        await ml.testExecution.logTestStep(`${testData.suiteTitle} redirects to data drift page`);
        await ml.dataDrift.clickAnalyzeWithoutSavingButton();
        await assertDataDriftPageContent(testData);
      });

      it(`${testData.suiteTitle} hides analyze data drift without saving option if patterns are same`, async () => {
        await ml.testExecution.logTestStep(
          `${testData.suiteTitle} loads navigates back to data view creation page`
        );
        await ml.navigation.navigateToDataDrift();
        await ml.dataDrift.navigateToCreateNewDataViewPage();
        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(true);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(true);

        await ml.testExecution.logTestStep(`${testData.suiteTitle} sets index patterns`);
        await ml.dataDrift.setIndexPatternInput('reference', 'ft_fare*');
        await ml.dataDrift.setIndexPatternInput('comparison', 'ft_fare*');

        await ml.dataDrift.assertAnalyzeWithoutSavingButtonMissing();
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(false);

        await ml.testExecution.logTestStep(`${testData.suiteTitle} redirects to data drift page`);
        await ml.dataDrift.clickAnalyzeDataDrift();
        await assertDataDriftPageContent(testData);
      });

      const nonTimeSeriesTestData: TestData = {
        suiteTitle: 'from data view creation mode',
        isSavedSearch: false,
        dateTimeField: '@timestamp',
        sourceIndexOrSavedSearch: 'ft_ihp_outlier',
        chartClickCoordinates: [0, 0],
      };

      it(`${nonTimeSeriesTestData.suiteTitle} loads non-time series data`, async () => {
        await ml.testExecution.logTestStep(
          `${nonTimeSeriesTestData.suiteTitle} loads navigates back to data view creation page`
        );
        await ml.navigation.navigateToDataDrift();
        await ml.jobSourceSelection.selectSourceForDataDrift(
          nonTimeSeriesTestData.sourceIndexOrSavedSearch
        );
        await ml.dataDrift.runAnalysis();
      });
    });
  });
}
