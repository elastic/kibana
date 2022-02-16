/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';
import { FieldVisConfig } from '../../../../../plugins/data_visualizer/public/application/common/components/stats_table/types';

interface MetricFieldVisConfig extends FieldVisConfig {
  statsMaxDecimalPlaces: number;
  docCountFormatted: string;
  topValuesCount: number;
  viewableInLens: boolean;
}

interface NonMetricFieldVisConfig extends FieldVisConfig {
  docCountFormatted: string;
  exampleCount: number;
  viewableInLens: boolean;
}

interface TestData {
  suiteTitle: string;
  sourceIndexOrSavedSearch: string;
  fieldNameFilters: string[];
  fieldTypeFilters: string[];
  rowsPerPage?: 10 | 25 | 50;
  sampleSizeValidations: Array<{
    size: number;
    expected: { field: string; docCountFormatted: string };
  }>;
  expected: {
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    emptyFields: string[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
    fieldNameFiltersResultCount: number;
    fieldTypeFiltersResultCount: number;
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const farequoteIndexPatternTestData: TestData = {
    suiteTitle: 'index pattern',
    sourceIndexOrSavedSearch: 'ft_farequote',
    fieldNameFilters: ['airline', '@timestamp'],
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.KEYWORD],
    sampleSizeValidations: [
      { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
      { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
    ],
    expected: {
      totalDocCountFormatted: '86,274',
      metricFields: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
          viewableInLens: true,
        },
      ],
      nonMetricFields: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          exampleCount: 2,
          viewableInLens: true,
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 10,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
      ],
      emptyFields: ['sourcetype'],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
      fieldNameFiltersResultCount: 2,
      fieldTypeFiltersResultCount: 3,
    },
  };

  const farequoteKQLSearchTestData: TestData = {
    suiteTitle: 'KQL saved search',
    sourceIndexOrSavedSearch: 'ft_farequote_kuery',
    fieldNameFilters: ['@version'],
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.DATE, ML_JOB_FIELD_TYPES.TEXT],
    sampleSizeValidations: [
      { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
      { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
    ],
    expected: {
      totalDocCountFormatted: '34,415',
      metricFields: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
          viewableInLens: true,
        },
      ],
      nonMetricFields: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          exampleCount: 2,
          viewableInLens: true,
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 5,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
      ],
      emptyFields: ['sourcetype'],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
      fieldNameFiltersResultCount: 1,
      fieldTypeFiltersResultCount: 3,
    },
  };

  const farequoteLuceneSearchTestData: TestData = {
    suiteTitle: 'lucene saved search',
    sourceIndexOrSavedSearch: 'ft_farequote_lucene',
    fieldNameFilters: ['@version.keyword', 'type'],
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.NUMBER],
    sampleSizeValidations: [
      { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
      { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
    ],
    expected: {
      totalDocCountFormatted: '34,416',
      metricFields: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
          viewableInLens: true,
        },
      ],
      nonMetricFields: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          exampleCount: 2,
          viewableInLens: true,
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 5,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
          viewableInLens: false,
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
        },
      ],
      emptyFields: ['sourcetype'],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
      fieldNameFiltersResultCount: 2,
      fieldTypeFiltersResultCount: 1,
    },
  };

  const sampleLogTestData: TestData = {
    suiteTitle: 'geo point field',
    sourceIndexOrSavedSearch: 'ft_module_sample_logs',
    fieldNameFilters: ['geo.coordinates'],
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.GEO_POINT],
    rowsPerPage: 50,
    expected: {
      totalDocCountFormatted: '408',
      metricFields: [],
      // only testing the geo_point fields
      nonMetricFields: [
        {
          fieldName: 'geo.coordinates',
          type: ML_JOB_FIELD_TYPES.GEO_POINT,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '408 (100%)',
          exampleCount: 10,
          viewableInLens: false,
        },
      ],
      emptyFields: [],
      visibleMetricFieldsCount: 4,
      totalMetricFieldsCount: 5,
      populatedFieldsCount: 35,
      totalFieldsCount: 36,
      fieldNameFiltersResultCount: 1,
      fieldTypeFiltersResultCount: 1,
    },
    sampleSizeValidations: [
      { size: 1000, expected: { field: 'geo.coordinates', docCountFormatted: '408 (100%)' } },
      { size: 5000, expected: { field: '@timestamp', docCountFormatted: '408 (100%)' } },
    ],
  };

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
          fieldRow.viewableInLens
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
      it(`${farequoteIndexPatternTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });

      runTests(farequoteIndexPatternTestData);

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
    });

    describe('with module_sample_logs ', function () {
      // Run tests on full farequote index.
      it(`${sampleLogTestData.suiteTitle} loads the data visualizer selector page`, async () => {
        // Start navigation from the base of the ML app.
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataVisualizer();
      });
      runTests(sampleLogTestData);
    });
  });
}
