/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_JOB_FIELD_TYPES } from '@kbn/ml-plugin/common/constants/field_types';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { MetricFieldVisConfig, NonMetricFieldVisConfig } from './types';
interface TestData {
  suiteTitle: string;
  sourceIndexOrSavedSearch: string;
  rowsPerPage?: 10 | 25 | 50;
  newFields?: Array<{ fieldName: string; type: string; script: string }>;
  fieldsToRename?: Array<{ originalName: string; newName: string }>;
  expected: {
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const originalTestData: TestData = {
    suiteTitle: 'original data view',
    sourceIndexOrSavedSearch: 'ft_farequote',
    expected: {
      totalDocCountFormatted: '86,274',
      metricFields: [],
      nonMetricFields: [],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
    },
  };
  const addDeleteFieldTestData: TestData = {
    suiteTitle: 'add field',
    sourceIndexOrSavedSearch: 'ft_farequote',
    newFields: [
      {
        fieldName: 'rt_airline_lowercase',
        type: 'Keyword',
        script: 'emit(params._source.airline.toLowerCase())',
      },
    ],
    expected: {
      totalDocCountFormatted: '86,274',
      metricFields: [],
      nonMetricFields: [
        {
          fieldName: 'rt_airline_lowercase',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          exampleCount: 10,
          docCountFormatted: '5000 (100%)',
          viewableInLens: true,
          hasActionMenu: true,
        },
      ],
      visibleMetricFieldsCount: 2,
      totalMetricFieldsCount: 2,
      populatedFieldsCount: 9,
      totalFieldsCount: 10,
    },
  };
  const customLabelTestData: TestData = {
    suiteTitle: 'custom label',
    sourceIndexOrSavedSearch: 'ft_farequote',
    fieldsToRename: [
      {
        originalName: 'responsetime',
        newName: 'new_responsetime',
      },
    ],
    expected: {
      totalDocCountFormatted: '86,274',
      metricFields: [
        {
          fieldName: 'new_responsetime',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          existsInDocs: true,
          aggregatable: true,
          loading: false,
          docCountFormatted: '5000 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 10,
          viewableInLens: true,
          hasActionMenu: false,
        },
      ],
      nonMetricFields: [],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 7,
      totalFieldsCount: 8,
    },
  };

  async function navigateToIndexDataVisualizer(testData: TestData) {
    // Start navigation from the base of the ML app.
    await ml.testExecution.logTestStep(
      `${testData.suiteTitle} loads the data visualizer selector page`
    );
    await ml.navigation.navigateToMl();
    await ml.navigation.navigateToDataVisualizer();

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

    await ml.testExecution.logTestStep(`${testData.suiteTitle} displays the time range step`);
    await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();

    await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
    await ml.dataVisualizerIndexBased.clickUseFullDataButton(
      testData.expected.totalDocCountFormatted
    );
  }

  async function checkPageDetails(testData: TestData) {
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
  }

  describe('data view management', function () {
    this.tags(['mlqa']);
    const indexPatternTitle = 'ft_farequote';
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    beforeEach(async () => {
      await ml.testResources.createIndexPatternIfNeeded(indexPatternTitle, '@timestamp');
      await navigateToIndexDataVisualizer(originalTestData);
    });

    afterEach(async () => {
      await ml.testResources.deleteIndexPatternByTitle(indexPatternTitle);
    });

    it(`adds new field`, async () => {
      await ml.testExecution.logTestStep('adds new runtime fields');
      for (const newField of addDeleteFieldTestData.newFields!) {
        await ml.dataVisualizerIndexPatternManagement.addRuntimeField(
          newField.fieldName,
          newField.script,
          newField.type
        );
      }

      await ml.testExecution.logTestStep('displays details for added runtime metric fields');
      for (const fieldRow of addDeleteFieldTestData.expected.metricFields as Array<
        Required<MetricFieldVisConfig>
      >) {
        await ml.dataVisualizerTable.assertNumberFieldContents(
          fieldRow.fieldName,
          fieldRow.docCountFormatted,
          fieldRow.topValuesCount,
          fieldRow.viewableInLens,
          fieldRow.hasActionMenu
        );
      }
      await ml.testExecution.logTestStep('displays details for added runtime non metric fields');
      for (const fieldRow of addDeleteFieldTestData.expected.nonMetricFields!) {
        await ml.dataVisualizerTable.assertNonMetricFieldContents(
          fieldRow.type,
          fieldRow.fieldName!,
          fieldRow.docCountFormatted,
          fieldRow.exampleCount,
          fieldRow.viewableInLens,
          fieldRow.hasActionMenu
        );
      }
      await checkPageDetails(addDeleteFieldTestData);
    });

    it(`sets custom label for existing field`, async () => {
      for (const field of customLabelTestData.fieldsToRename!) {
        await ml.dataVisualizerIndexPatternManagement.renameField(
          field.originalName,
          field.newName
        );
        await ml.dataVisualizerTable.assertDisplayName(field.originalName, field.newName);
      }
    });

    it(`deletes existing field`, async () => {
      await ml.testExecution.logTestStep('adds new runtime fields');
      for (const newField of addDeleteFieldTestData.newFields!) {
        await ml.dataVisualizerIndexPatternManagement.addRuntimeField(
          newField.fieldName,
          newField.script,
          newField.type
        );
      }
      await ml.testExecution.logTestStep('deletes newly added runtime fields');
      for (const fieldToDelete of addDeleteFieldTestData.newFields!) {
        await ml.dataVisualizerIndexPatternManagement.deleteField(fieldToDelete.fieldName);
      }

      await ml.testExecution.logTestStep('displays page details without the deleted fields');
      await checkPageDetails(originalTestData);
    });
  });
}
