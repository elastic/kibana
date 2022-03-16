/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData, MetricFieldVisConfig } from './types';
import {
  farequoteDataViewTestData,
  farequoteKQLFiltersSearchTestData,
  farequoteKQLSearchTestData,
  farequoteLuceneSearchTestData,
  sampleLogTestData,
} from './index_test_data';
import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const headerPage = getPageObject('header');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the source data in the data visualizer`, async () => {
      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the saved search selection page`
      );
      await ml.dataVisualizer.navigateToIndexPatternSelection();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} loads the index data visualizer page`
      );
      await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
        testData.sourceIndexOrSavedSearch
      );
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
      await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.dataVisualizerIndexBased.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );
      await headerPage.waitUntilLoadingHasFinished();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the doc count panel correctly`
      );
      await ml.dataVisualizerIndexBased.assertTotalDocCountHeaderExist();
      await ml.dataVisualizerIndexBased.assertTotalDocCountChartExist();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the data visualizer table correctly`
      );
      await ml.dataVisualizerIndexBased.assertDataVisualizerTableExist();

      if (testData.rowsPerPage) {
        await ml.dataVisualizerTable.ensureNumRowsPerPage(testData.rowsPerPage);
      }

      await ml.dataVisualizerTable.assertSearchPanelExist();
      await ml.dataVisualizerTable.assertSampleSizeInputExists();
      await ml.dataVisualizerTable.assertFieldTypeInputExists();
      await ml.dataVisualizerTable.assertFieldNameInputExists();

      await ml.dataVisualizerIndexBased.assertFieldCountPanelExist();
      await ml.dataVisualizerIndexBased.assertMetricFieldsSummaryExist();
      await ml.dataVisualizerIndexBased.assertFieldsSummaryExist();
      await ml.dataVisualizerIndexBased.assertVisibleMetricFieldsCount(
        testData.expected.visibleMetricFieldsCount
      );
      await ml.dataVisualizerIndexBased.assertTotalMetricFieldsCount(
        testData.expected.totalMetricFieldsCount
      );
      await ml.dataVisualizerIndexBased.assertVisibleFieldsCount(
        testData.expected.populatedFieldsCount
      );
      await ml.dataVisualizerIndexBased.assertTotalFieldsCount(testData.expected.totalFieldsCount);

      if (testData.expected.filters) {
        await ml.testExecution.logTestStep('displays filters in filter bar correctly');
        for (const filter of testData.expected.filters!) {
          await ml.dataVisualizerIndexBased.assertFilterBarFilterContent(filter);
        }
      }

      await ml.testExecution.logTestStep(
        'displays details for metric fields and non-metric fields correctly'
      );
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

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} sample size control changes non-metric fields`
      );
      for (const sampleSizeCase of testData.sampleSizeValidations) {
        const { size, expected } = sampleSizeCase;
        await ml.dataVisualizerTable.setSampleSizeInputValue(
          size,
          expected.field,
          expected.docCountFormatted
        );
      }

      await ml.testExecution.logTestStep('sets and resets field type filter correctly');
      await ml.dataVisualizerTable.setFieldTypeFilter(
        testData.fieldTypeFilters,
        testData.expected.fieldTypeFiltersResultCount
      );
      await ml.dataVisualizerTable.removeFieldTypeFilter(
        testData.fieldTypeFilters,
        testData.expected.populatedFieldsCount
      );

      await ml.testExecution.logTestStep('sets and resets field name filter correctly');
      await ml.dataVisualizerTable.setFieldNameFilter(
        testData.fieldNameFilters,
        testData.expected.fieldNameFiltersResultCount
      );
      await ml.dataVisualizerTable.removeFieldNameFilter(
        testData.fieldNameFilters,
        testData.expected.populatedFieldsCount
      );

      await ml.testExecution.logTestStep('displays unpopulated fields correctly');
      await ml.dataVisualizerTable.setShowEmptyFieldsSwitchState(
        true,
        testData.expected.emptyFields
      );
    });
  }

  describe('index based', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');

      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_logs');
    });

    describe('with farequote', function () {
      // Run tests on full farequote index.
      it(`${farequoteDataViewTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteDataViewTestData);

      // Run tests on farequote KQL saved search.
      it(`${farequoteKQLSearchTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Only navigate back to the data visualizer selector page before running next tests,
        // to ensure the time picker isn't set back to the default (last 15 minutes).
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteKQLSearchTestData);

      // Run tests on farequote lucene saved search.
      it(`${farequoteLuceneSearchTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Only navigate back to the data visualizer selector page before running next tests,
        // to ensure the time picker isn't set back to the default (last 15 minutes).
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteLuceneSearchTestData);

      it(`${farequoteKQLFiltersSearchTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteKQLFiltersSearchTestData);
    });

    describe('with module_sample_logs ', function () {
      // Run tests on full ft_module_sample_logs index.
      it(`${sampleLogTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });
      runTests(sampleLogTestData);
    });

    describe('with view in lens action ', function () {
      const testData = farequoteDataViewTestData;
      // Run tests on full ft_module_sample_logs index.
      it(`${testData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });

      it(`${testData.suiteTitle} loads lens charts`, async () => {
        await ml.testExecution.logTestStep(
          `${testData.suiteTitle} loads the saved search selection page`
        );
        await ml.dataVisualizer.navigateToIndexPatternSelection();

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
        await headerPage.waitUntilLoadingHasFinished();

        await ml.testExecution.logTestStep('navigate to Lens');
        const lensMetricField = testData.expected.metricFields![0];

        if (lensMetricField) {
          await ml.dataVisualizerTable.assertLensActionShowChart(
            lensMetricField.fieldName,
            'mtrVis'
          );
          await ml.navigation.browserBackTo('dataVisualizerTable');
        }
        const lensNonMetricField = testData.expected.nonMetricFields?.find(
          (f) => f.type === ML_JOB_FIELD_TYPES.KEYWORD
        );

        if (lensNonMetricField) {
          await ml.dataVisualizerTable.assertLensActionShowChart(
            lensNonMetricField.fieldName,
            'mtrVis'
          );
          await ml.navigation.browserBackTo('dataVisualizerTable');
        }
      });
    });
  });
}
