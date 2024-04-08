/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ML_JOB_FIELD_TYPES } from '@kbn/ml-anomaly-utils';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { MetricFieldVisConfig, NonMetricFieldVisConfig } from './types';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TestData {
  suiteTitle: string;
  query: string;
  rowsPerPage?: 10 | 25 | 50;
  sourceIndexOrSavedSearch?: string;
  expected: {
    hasDocCountChart: boolean;
    initialLimitSize?: string;
    totalDocCountFormatted: string;
    metricFields?: MetricFieldVisConfig[];
    nonMetricFields?: NonMetricFieldVisConfig[];
    emptyFields: string[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
  };
}

const esqlFarequoteData = {
  suiteTitle: 'ES|QL farequote',
  query: 'from `ft_farequote`',
  sourceIndexOrSavedSearch: 'ft_farequote',
  expected: {
    hasDocCountChart: true,
    initialLimitSize: '10,000 (100%)',
    totalDocCountFormatted: '86,274',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '86,274 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 11,
        viewableInLens: false,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '86,274 (100%)',
        exampleCount: 2,
        viewableInLens: false,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 11,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '86,274 (100%)',
        viewableInLens: false,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
  },
};
const esqlSampleLogData: TestData = {
  suiteTitle: 'ES|QL module_sample_logs',
  query: `from ft_module_sample_logs
| where bytes > 7000 and response.keyword == "200"
| eval bytes_kb = bytes/1000
| stats max_bytes_kb = max(bytes_kb), min_machine_ram = min(machine.ram) by clientip, geo.coordinates`,
  sourceIndexOrSavedSearch: 'ft_module_sample_logs',
  expected: {
    hasDocCountChart: false,
    totalDocCountFormatted: '149',
    metricFields: [
      {
        fieldName: 'max_bytes_kb',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (95.97%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 12,
        viewableInLens: false,
      },
      {
        fieldName: 'min_machine_ram',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (95.97%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 20,
        viewableInLens: false,
      },
    ],
    nonMetricFields: [
      {
        fieldName: 'geo.coordinates',
        type: ML_JOB_FIELD_TYPES.GEO_POINT,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (95.97%)',
        exampleCount: 10,
        viewableInLens: false,
      },
      {
        fieldName: 'clientip',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '143 (95.97%)',
        exampleCount: 11,
        viewableInLens: false,
      },
    ],
    emptyFields: [],
    visibleMetricFieldsCount: 2,
    totalMetricFieldsCount: 2,
    populatedFieldsCount: 4,
    totalFieldsCount: 4,
  },
};

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const headerPage = getPageObject('header');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  function runTests(testData: TestData) {
    it(`${testData.suiteTitle} loads the ES|QL data visualizer page`, async () => {
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataESQLDataVisualizer();
    });

    it('should show the ES|QL editor and top panels', async () => {
      await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();
    });

    it(`${testData.suiteTitle} displays index details`, async () => {
      await ml.dataVisualizer.setESQLQuery(testData.query);

      await ml.dataVisualizerTable.assertTableRowCount(0);

      await ml.testExecution.logTestStep(`${testData.suiteTitle} loads data for full time range`);
      await ml.dataVisualizerIndexBased.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted,
        'none'
      );
      await headerPage.waitUntilLoadingHasFinished();

      await ml.dataVisualizerIndexBased.assertTotalDocCountHeaderExist();

      if (testData.expected.hasDocCountChart) {
        await ml.dataVisualizerIndexBased.assertTotalDocCountChartExist();
      }

      await ml.testExecution.logTestStep(
        `${testData.suiteTitle} displays elements in the data visualizer table correctly`
      );
      await ml.dataVisualizerIndexBased.assertDataVisualizerTableExist();

      if (testData.rowsPerPage) {
        await ml.dataVisualizerTable.ensureNumRowsPerPage(testData.rowsPerPage);
      }

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

      await ml.testExecution.logTestStep('displays unpopulated fields correctly');
      await ml.dataVisualizerTable.setShowEmptyFieldsSwitchState(
        true,
        testData.expected.emptyFields
      );
    });

    it(`${testData.suiteTitle} updates data when limit size changes`, async () => {
      if (testData.expected.initialLimitSize !== undefined) {
        await ml.testExecution.logTestStep('shows analysis for 10,000 rows by default');
        for (const fieldRow of testData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await ml.dataVisualizerTable.assertNumberFieldContents(
            fieldRow.fieldName,
            testData.expected.initialLimitSize,
            undefined,
            false,
            false,
            true
          );
        }
      }

      await ml.testExecution.logTestStep('sets limit size to Analyze all');
      await ml.dataVisualizer.setLimitSize('none');

      await ml.testExecution.logTestStep('updates table with newly set limit size');
      for (const fieldRow of testData.expected.metricFields as Array<
        Required<MetricFieldVisConfig>
      >) {
        await ml.dataVisualizerTable.assertNumberFieldContents(
          fieldRow.fieldName,
          fieldRow.docCountFormatted,
          undefined,
          false,
          false,
          true
        );
      }

      for (const fieldRow of testData.expected.nonMetricFields!) {
        await ml.dataVisualizerTable.assertNonMetricFieldContents(
          fieldRow.type,
          fieldRow.fieldName!,
          fieldRow.docCountFormatted,
          fieldRow.exampleCount,
          false,
          false,
          undefined
        );
      }
    });
  }

  describe('esql', function () {
    this.tags(['ml']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');

      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    describe('with farequote', function () {
      runTests(esqlFarequoteData);
    });

    // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/180072
    describe.skip('with module_sample_logs ', function () {
      runTests(esqlSampleLogData);
    });
  });
}
