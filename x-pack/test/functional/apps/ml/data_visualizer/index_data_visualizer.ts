/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';
import { FieldVisConfig } from '../../../../../plugins/ml/public/application/datavisualizer/index_based/common';

interface MetricFieldVisConfig extends FieldVisConfig {
  statsMaxDecimalPlaces: number;
  docCountFormatted: string;
  topValuesCount: number;
}

interface NonMetricFieldVisConfig extends FieldVisConfig {
  docCountFormatted: string;
  exampleCount?: number;
}

interface TestData {
  suiteTitle: string;
  sourceIndexOrSavedSearch: string;
  metricFieldsFilter: string;
  nonMetricFieldsFilter: string;
  nonMetricFieldsTypeFilter: string;
  expected: {
    totalDocCountFormatted: string;
    fieldsPanelCount: number;
    metricCards?: MetricFieldVisConfig[];
    nonMetricCards?: NonMetricFieldVisConfig[];
    nonMetricFieldsTypeFilterCardCount: number;
    metricFieldsFilterCardCount: number;
    nonMetricFieldsFilterCardCount: number;
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const farequoteIndexPatternTestData: TestData = {
    suiteTitle: 'index pattern',
    sourceIndexOrSavedSearch: 'ft_farequote',
    metricFieldsFilter: 'document',
    nonMetricFieldsFilter: 'airline',
    nonMetricFieldsTypeFilter: 'keyword',
    expected: {
      totalDocCountFormatted: '86,274',
      fieldsPanelCount: 2, // Metrics panel and Fields panel
      metricCards: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
        },
      ],
      nonMetricCards: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 10,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
      ],
      nonMetricFieldsTypeFilterCardCount: 3,
      metricFieldsFilterCardCount: 1,
      nonMetricFieldsFilterCardCount: 1,
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
    },
  };

  const farequoteKQLSearchTestData: TestData = {
    suiteTitle: 'KQL saved search',
    sourceIndexOrSavedSearch: 'ft_farequote_kuery',
    metricFieldsFilter: 'responsetime',
    nonMetricFieldsFilter: 'airline',
    nonMetricFieldsTypeFilter: 'keyword',
    expected: {
      totalDocCountFormatted: '34,415',
      fieldsPanelCount: 2, // Metrics panel and Fields panel
      metricCards: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
        },
      ],
      nonMetricCards: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 5,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
      ],
      nonMetricFieldsTypeFilterCardCount: 3,
      metricFieldsFilterCardCount: 2,
      nonMetricFieldsFilterCardCount: 1,
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
    },
  };

  const farequoteLuceneSearchTestData: TestData = {
    suiteTitle: 'lucene saved search',
    sourceIndexOrSavedSearch: 'ft_farequote_lucene',
    metricFieldsFilter: 'responsetime',
    nonMetricFieldsFilter: 'version',
    nonMetricFieldsTypeFilter: 'keyword',
    expected: {
      totalDocCountFormatted: '34,416',
      fieldsPanelCount: 2, // Metrics panel and Fields panel
      metricCards: [
        {
          fieldName: 'responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
        },
      ],
      nonMetricCards: [
        {
          fieldName: '@timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: '@version',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: '@version.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'airline',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 5,
          docCountFormatted: '5000 (100%)',
        },
        {
          fieldName: 'type',
          type: ML_JOB_FIELD_TYPES.TEXT,
          existsInDocs: true,
          aggregatable: false,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '',
        },
        {
          fieldName: 'type.keyword',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 1,
          docCountFormatted: '5000 (100%)',
        },
      ],
      nonMetricFieldsTypeFilterCardCount: 3,
      metricFieldsFilterCardCount: 2,
      nonMetricFieldsFilterCardCount: 1,
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
    },
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
        `${testData.suiteTitle} displays elements in the search panel correctly`
      );
      await ml.dataVisualizerIndexBased.assertSearchPanelExist();
      await ml.dataVisualizerIndexBased.assertSampleSizeInputExists();
      await ml.dataVisualizerIndexBased.assertFieldTypeInputExists();
      await ml.dataVisualizerIndexBased.assertFieldNameInputExists();

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the field count panel correctly`
      );
      await ml.dataVisualizerIndexBased.assertFieldCountPanelExist();
      await ml.dataVisualizerIndexBased.assertMetricFieldsSummaryExist();
      await ml.dataVisualizerIndexBased.assertFieldsSummaryExist();
      await ml.dataVisualizerIndexBased.assertShowEmptyFieldsSwitchExists();
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
        `${testData.suiteTitle} displays the data visualizer table`
      );
      await ml.dataVisualizerIndexBased.assertDataVisualizerTableExist();

      await ml.testExecution.logTestStep(
        'displays details for metric fields and non-metric fields correctly'
      );
      for (const fieldCard of testData.expected.metricCards as Array<
        Required<MetricFieldVisConfig>
      >) {
        await ml.dataVisualizerTable.assertNumberFieldContents(
          fieldCard.fieldName,
          fieldCard.docCountFormatted
        );
      }

      for (const fieldCard of testData.expected.nonMetricCards as Array<
        Required<MetricFieldVisConfig>
      >) {
        await ml.dataVisualizerTable.assertRowExists(fieldCard.fieldName);
      }

      for (const fieldCard of testData.expected.nonMetricCards!) {
        await ml.dataVisualizerTable.assertNonMetricFieldContents(
          fieldCard.type,
          fieldCard.fieldName!,
          fieldCard.docCountFormatted
        );
      }
    });
  }

  describe('index based', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
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
  });
}
