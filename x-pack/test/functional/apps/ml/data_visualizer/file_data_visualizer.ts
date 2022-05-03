/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { ML_JOB_FIELD_TYPES } from '@kbn/ml-plugin/common/constants/field_types';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const testDataListPositive = [
    {
      suiteSuffix: 'with an artificial server log',
      filePath: path.join(__dirname, 'files_to_import', 'artificial_server_log'),
      indexName: 'user-import_1',
      createIndexPattern: false,
      fieldTypeFilters: [ML_JOB_FIELD_TYPES.NUMBER, ML_JOB_FIELD_TYPES.DATE],
      fieldNameFilters: ['clientip'],
      expected: {
        results: {
          title: 'artificial_server_log',
          numberOfFields: 4,
        },
        metricFields: [
          {
            fieldName: 'bytes',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            docCountFormatted: '19 (100%)',
            statsMaxDecimalPlaces: 3,
            topValuesCount: 8,
          },
          {
            fieldName: 'httpversion',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            docCountFormatted: '19 (100%)',
            statsMaxDecimalPlaces: 3,
            topValuesCount: 1,
          },
          {
            fieldName: 'response',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            docCountFormatted: '19 (100%)',
            statsMaxDecimalPlaces: 3,
            topValuesCount: 3,
          },
        ],
        nonMetricFields: [
          {
            fieldName: 'timestamp',
            type: ML_JOB_FIELD_TYPES.DATE,
            docCountFormatted: '19 (100%)',
            exampleCount: 10,
          },
          {
            fieldName: 'agent',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 8,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'auth',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 1,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'ident',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 1,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'verb',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 1,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'request',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 2,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'referrer',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            exampleCount: 1,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'clientip',
            type: ML_JOB_FIELD_TYPES.IP,
            exampleCount: 7,
            docCountFormatted: '19 (100%)',
          },
          {
            fieldName: 'message',
            type: ML_JOB_FIELD_TYPES.TEXT,
            exampleCount: 10,
            docCountFormatted: '19 (100%)',
          },
        ],
        visibleMetricFieldsCount: 3,
        totalMetricFieldsCount: 3,
        populatedFieldsCount: 12,
        totalFieldsCount: 12,
        fieldTypeFiltersResultCount: 4,
        fieldNameFiltersResultCount: 1,
        ingestedDocCount: 20,
      },
    },
    {
      suiteSuffix: 'with a file containing geo field',
      filePath: path.join(__dirname, 'files_to_import', 'geo_file.csv'),
      indexName: 'user-import_2',
      createIndexPattern: false,
      fieldTypeFilters: [ML_JOB_FIELD_TYPES.GEO_POINT],
      fieldNameFilters: ['Coordinates'],
      expected: {
        results: {
          title: 'geo_file.csv',
          numberOfFields: 3,
        },
        metricFields: [],
        nonMetricFields: [
          {
            fieldName: 'Context',
            type: ML_JOB_FIELD_TYPES.UNKNOWN,
            docCountFormatted: '0 (0%)',
            exampleCount: 0,
          },
          {
            fieldName: 'Coordinates',
            type: ML_JOB_FIELD_TYPES.GEO_POINT,
            docCountFormatted: '13 (100%)',
            exampleCount: 7,
          },
          {
            fieldName: 'Location',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            docCountFormatted: '13 (100%)',
            exampleCount: 7,
          },
        ],
        visibleMetricFieldsCount: 0,
        totalMetricFieldsCount: 0,
        populatedFieldsCount: 3,
        totalFieldsCount: 3,
        fieldTypeFiltersResultCount: 1,
        fieldNameFiltersResultCount: 1,
        ingestedDocCount: 13,
      },
    },
    {
      suiteSuffix: 'with a file with a missing new line char at the end',
      filePath: path.join(__dirname, 'files_to_import', 'missing_end_of_file_newline.csv'),
      indexName: 'user-import_3',
      createIndexPattern: false,
      fieldTypeFilters: [],
      fieldNameFilters: [],
      expected: {
        results: {
          title: 'missing_end_of_file_newline.csv',
          numberOfFields: 3,
        },
        metricFields: [
          {
            fieldName: 'value',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            docCountFormatted: '3 (100%)',
            exampleCount: 3,
            topValuesCount: 3,
          },
        ],
        nonMetricFields: [
          {
            fieldName: 'title',
            type: ML_JOB_FIELD_TYPES.UNKNOWN,
            docCountFormatted: '3 (100%)',
            exampleCount: 3,
          },
          {
            fieldName: 'description',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            docCountFormatted: '3 (100%)',
            exampleCount: 3,
          },
        ],
        visibleMetricFieldsCount: 0,
        totalMetricFieldsCount: 0,
        populatedFieldsCount: 3,
        totalFieldsCount: 3,
        fieldTypeFiltersResultCount: 3,
        fieldNameFiltersResultCount: 3,
        ingestedDocCount: 3,
      },
    },
  ];

  const testDataListNegative = [
    {
      suiteSuffix: 'with a non-log file',
      filePath: path.join(__dirname, 'files_to_import', 'not_a_log_file'),
    },
  ];

  describe('file based', function () {
    this.tags(['mlqa']);
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToMl();
    });

    for (const testData of testDataListPositive) {
      describe(testData.suiteSuffix, function () {
        after(async () => {
          await ml.api.deleteIndices(testData.indexName);
        });

        it('displays and imports a file', async () => {
          await ml.testExecution.logTestStep('loads the data visualizer selector page');
          await ml.navigation.navigateToDataVisualizer();

          await ml.testExecution.logTestStep('loads the file upload page');
          await ml.dataVisualizer.navigateToFileUpload();

          await ml.testExecution.logTestStep('selects a file and loads visualizer results');
          await ml.dataVisualizerFileBased.selectFile(testData.filePath);

          await ml.testExecution.logTestStep('displays the components of the file details page');
          await ml.dataVisualizerFileBased.assertFileTitle(testData.expected.results.title);
          await ml.dataVisualizerFileBased.assertFileContentPanelExists();
          await ml.dataVisualizerFileBased.assertSummaryPanelExists();
          await ml.dataVisualizerFileBased.assertFileStatsPanelExists();

          await ml.testExecution.logTestStep(
            `displays elements in the data visualizer table correctly`
          );
          await ml.dataVisualizerIndexBased.assertDataVisualizerTableExist();

          await ml.dataVisualizerIndexBased.assertVisibleMetricFieldsCount(
            testData.expected.visibleMetricFieldsCount
          );
          await ml.dataVisualizerIndexBased.assertTotalMetricFieldsCount(
            testData.expected.totalMetricFieldsCount
          );
          await ml.dataVisualizerIndexBased.assertVisibleFieldsCount(
            testData.expected.totalFieldsCount
          );
          await ml.dataVisualizerIndexBased.assertTotalFieldsCount(
            testData.expected.totalFieldsCount
          );

          await ml.testExecution.logTestStep(
            'displays details for metric fields and non-metric fields correctly'
          );
          await ml.dataVisualizerTable.ensureNumRowsPerPage(25);

          for (const fieldRow of testData.expected.metricFields) {
            await ml.dataVisualizerTable.assertNumberFieldContents(
              fieldRow.fieldName,
              fieldRow.docCountFormatted,
              fieldRow.topValuesCount,
              false,
              false,
              false
            );
          }
          for (const fieldRow of testData.expected.nonMetricFields!) {
            await ml.dataVisualizerTable.assertNonMetricFieldContents(
              fieldRow.type,
              fieldRow.fieldName!,
              fieldRow.docCountFormatted,
              fieldRow.exampleCount,
              false
            );
          }

          await ml.testExecution.logTestStep('sets and resets field type filter correctly');
          await ml.dataVisualizerTable.setFieldTypeFilter(
            testData.fieldTypeFilters,
            testData.expected.fieldTypeFiltersResultCount
          );
          await ml.dataVisualizerTable.removeFieldTypeFilter(
            testData.fieldTypeFilters,
            testData.expected.totalFieldsCount
          );

          await ml.testExecution.logTestStep('sets and resets field name filter correctly');
          await ml.dataVisualizerTable.setFieldNameFilter(
            testData.fieldNameFilters,
            testData.expected.fieldNameFiltersResultCount
          );
          await ml.dataVisualizerTable.removeFieldNameFilter(
            testData.fieldNameFilters,
            testData.expected.totalFieldsCount
          );

          await ml.testExecution.logTestStep('loads the import settings page');
          await ml.dataVisualizerFileBased.navigateToFileImport();

          await ml.testExecution.logTestStep('sets the index name');
          await ml.dataVisualizerFileBased.setIndexName(testData.indexName);

          await ml.testExecution.logTestStep('sets the create data view checkbox');
          await ml.dataVisualizerFileBased.setCreateIndexPatternCheckboxState(
            testData.createIndexPattern
          );

          await ml.testExecution.logTestStep('imports the file');
          await ml.dataVisualizerFileBased.startImportAndWaitForProcessing();

          await ml.dataVisualizerFileBased.assertIngestedDocCount(
            testData.expected.ingestedDocCount
          );

          await ml.testExecution.logTestStep('creates filebeat config');
          await ml.dataVisualizerFileBased.selectCreateFilebeatConfig();

          await ml.testExecution.logTestStep('closes filebeat config');
          await ml.dataVisualizerFileBased.closeCreateFilebeatConfig();
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe(testData.suiteSuffix, function () {
        it('does not import an invalid file', async () => {
          await ml.testExecution.logTestStep('loads the data visualizer selector page');
          await ml.navigation.navigateToDataVisualizer();

          await ml.testExecution.logTestStep('loads the file upload page');
          await ml.dataVisualizer.navigateToFileUpload();

          await ml.testExecution.logTestStep('selects a file and displays an error');
          await ml.dataVisualizerFileBased.selectFile(testData.filePath, true);
        });
      });
    }
  });
}
