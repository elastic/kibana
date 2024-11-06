/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const farequoteKQLFiltersSearchTestData = {
  suiteTitle: 'KQL saved search and filters',
  isSavedSearch: true,
  dateTimeField: '@timestamp',
  sourceIndexOrSavedSearch: 'ft_farequote_filter_and_kuery',
  chartClickCoordinates: [0, 0] as [number, number],
  comparisonChartClickCoordinates: [2, 1] as [number, number],
  dataViewName: 'ft_farequote',
  totalDocCount: '5,674',
};

const dataViewCreationTestData = {
  suiteTitle: 'from data view creation mode',
  isSavedSearch: true,
  dateTimeField: '@timestamp',
  chartClickCoordinates: [0, 0] as [number, number],
  comparisonChartClickCoordinates: [2, 2] as [number, number],
  totalDocCount: '86,274',
};

const nonTimeSeriesTestData = {
  suiteTitle: 'from data view creation mode',
  isSavedSearch: false,
  dateTimeField: '@timestamp',
  sourceIndexOrSavedSearch: 'ft_ihp_outlier',
  dataViewName: 'ft_ihp_outlier',
};

type TestData =
  | typeof farequoteKQLFiltersSearchTestData
  | typeof dataViewCreationTestData
  | typeof nonTimeSeriesTestData;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'console', 'header', 'home', 'security']);
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');

  async function assertDataDriftPageContent(testData: TestData) {
    await PageObjects.header.waitUntilLoadingHasFinished();

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
      `${testData.suiteTitle} displays elements on the page correctly`
    );
    await ml.dataDrift.assertNoWindowParametersEmptyPromptExists();

    if ('chartClickCoordinates' in testData) {
      await ml.testExecution.logTestStep('clicks the document count chart to start analysis');
      await ml.dataDrift.clickDocumentCountChart('Reference', testData.chartClickCoordinates);
      await ml.dataDrift.assertRunAnalysisButtonState(true);
      await ml.dataDrift.clickDocumentCountChart(
        'Comparison',
        testData.comparisonChartClickCoordinates
      );
    }
    await ml.dataDrift.assertRunAnalysisButtonState(false);
    await ml.dataDrift.runAnalysis();
  }

  describe('data drift', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createDataViewIfNeeded('ft_ihp_outlier');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await Promise.all([
        ml.testResources.deleteDataViewByTitle('ft_fare*'),
        ml.testResources.deleteDataViewByTitle('ft_fare*,ft_fareq*'),
        ml.testResources.deleteDataViewByTitle('ft_farequote'),
        ml.testResources.deleteDataViewByTitle('ft_ihp_outlier'),
      ]);
    });

    describe('with ft_farequote_filter_and_kuery from index selection page', function () {
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

        if (farequoteKQLFiltersSearchTestData.dataViewName !== undefined) {
          await ml.dataDrift.assertDataViewTitle(farequoteKQLFiltersSearchTestData.dataViewName);
        }

        await ml.dataDrift.assertTotalDocumentCount(
          'Reference',
          farequoteKQLFiltersSearchTestData.totalDocCount
        );
        await ml.dataDrift.assertTotalDocumentCount(
          'Comparison',
          farequoteKQLFiltersSearchTestData.totalDocCount
        );
      });
    });

    describe(dataViewCreationTestData.suiteTitle, function () {
      beforeEach(`${dataViewCreationTestData.suiteTitle} loads the ml page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await elasticChart.setNewChartUiDebugFlag(true);
        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} loads the saved search selection page`
        );
        await ml.navigation.navigateToDataDrift();
      });

      it(`${dataViewCreationTestData.suiteTitle} allows analyzing data drift without saving`, async () => {
        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} creates new data view`
        );
        await ml.dataDrift.navigateToCreateNewDataViewPage();
        await ml.dataDrift.assertIndexPatternNotEmptyFormErrorExists('reference');
        await ml.dataDrift.assertIndexPatternNotEmptyFormErrorExists('comparison');
        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(true);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(true);

        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} sets index patterns`
        );
        await ml.dataDrift.setIndexPatternInput('reference', 'ft_fare*');
        await ml.dataDrift.setIndexPatternInput('comparison', 'ft_fareq*');

        await ml.dataDrift.selectTimeField(dataViewCreationTestData.dateTimeField);

        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(false);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(false);

        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} redirects to data drift page`
        );
        await ml.dataDrift.clickAnalyzeWithoutSavingButton();
        await assertDataDriftPageContent(dataViewCreationTestData);
        await ml.dataDrift.assertDataViewTitle('ft_fare*,ft_fareq*');
        await ml.dataDrift.assertTotalDocumentCount(
          'Reference',
          dataViewCreationTestData.totalDocCount
        );
        await ml.dataDrift.assertTotalDocumentCount(
          'Comparison',
          dataViewCreationTestData.totalDocCount
        );
      });

      it(`${dataViewCreationTestData.suiteTitle} hides analyze data drift without saving option if patterns are same`, async () => {
        await ml.dataDrift.navigateToCreateNewDataViewPage();
        await ml.dataDrift.assertAnalyzeWithoutSavingButtonState(true);
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(true);

        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} sets index patterns`
        );
        await ml.dataDrift.setIndexPatternInput('reference', 'ft_fare*');
        await ml.dataDrift.setIndexPatternInput('comparison', 'ft_fare*');

        await ml.dataDrift.assertAnalyzeWithoutSavingButtonMissing();
        await ml.dataDrift.assertAnalyzeDataDriftButtonState(false);

        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} redirects to data drift page`
        );
        await ml.dataDrift.clickAnalyzeDataDrift();
        await assertDataDriftPageContent(dataViewCreationTestData);

        await ml.testExecution.logTestStep(
          `${dataViewCreationTestData.suiteTitle} does not create new data view, and uses available one with matching index pattern`
        );
        await ml.dataDrift.assertDataViewTitle('ft_farequote');
        await ml.dataDrift.assertTotalDocumentCount(
          'Reference',
          dataViewCreationTestData.totalDocCount
        );
        await ml.dataDrift.assertTotalDocumentCount(
          'Comparison',
          dataViewCreationTestData.totalDocCount
        );
      });

      it(`${nonTimeSeriesTestData.suiteTitle} loads non-time series data`, async () => {
        await ml.jobSourceSelection.selectSourceForDataDrift(
          nonTimeSeriesTestData.sourceIndexOrSavedSearch
        );
        await ml.dataDrift.runAnalysis();
      });
    });
  });
}
