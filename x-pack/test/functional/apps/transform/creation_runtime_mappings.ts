/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '../../../../plugins/transform/common/constants';

import { FtrProviderContext } from '../../ftr_provider_context';

import type { HistogramCharts } from '../../services/transform/wizard';

import {
  GroupByEntry,
  isLatestTransformTestData,
  isPivotTransformTestData,
  LatestTransformTestData,
  PivotTransformTestData,
} from './index';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  const runtimeMappings = {
    rt_airline_lower: {
      type: 'keyword',
      script: 'emit(params._source.airline.toLowerCase())',
    },
    rt_responsetime_x_2: {
      type: 'double',
      script: "emit(doc['responsetime'].value * 2.0)",
    },
  };

  describe('creation with runtime mappings', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await transform.testResources.setKibanaTimeZoneToUTC();

      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
      await transform.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    const histogramCharts: HistogramCharts = [
      {
        // Skipping colorStats assertion for this chart,
        // results can be quite different on each run because of sampling.
        chartAvailable: true,
        id: '@timestamp',
      },
      {
        chartAvailable: true,
        id: '@version',
        legend: '1 category',
        colorStats: [
          { color: '#000000', percentage: 10 },
          { color: '#54B399', percentage: 90 },
        ],
      },
      {
        chartAvailable: true,
        id: 'airline',
        legend: '19 categories',
        colorStats: [
          { color: '#000000', percentage: 49 },
          { color: '#54B399', percentage: 50 },
        ],
      },
      {
        chartAvailable: true,
        id: 'responsetime',
        colorStats: [
          // below 10% threshold
          // { color: '#54B399', percentage: 5 },
          { color: '#000000', percentage: 95 },
        ],
      },
      {
        chartAvailable: true,
        id: 'rt_airline_lower',
        legend: '19 categories',
        colorStats: [
          { color: '#000000', percentage: 49 },
          { color: '#54B399', percentage: 50 },
        ],
      },
      {
        chartAvailable: true,
        id: 'rt_responsetime_x_2',
        colorStats: [
          // below 10% threshold
          // { color: '#54B399', percentage: 5 },
          { color: '#000000', percentage: 95 },
        ],
      },
      {
        chartAvailable: true,
        id: 'type',
        legend: '1 category',
        colorStats: [
          { color: '#000000', percentage: 10 },
          { color: '#54B399', percentage: 90 },
        ],
      },
    ];

    const testDataList: Array<PivotTransformTestData | LatestTransformTestData> = [
      {
        type: 'pivot',
        suiteTitle: 'batch transform with pivot configurations and runtime mappings',
        source: 'ft_farequote',
        groupByEntries: [
          {
            identifier: 'terms(rt_airline_lower)',
            label: 'rt_airline_lower',
          } as GroupByEntry,
        ],
        aggregationEntries: [
          {
            identifier: 'max(rt_responsetime_x_2)',
            label: 'rt_responsetime_x_2.max',
          },
          {
            identifier: 'min(rt_responsetime_x_2)',
            label: 'rt_responsetime_x_2.min',
          },
          {
            identifier: 'avg(rt_responsetime_x_2)',
            label: 'rt_responsetime_x_2.avg',
          },
        ],
        transformId: `ec_1_${Date.now()}`,
        transformDescription: 'ecommerce batch transform with group by terms(rt_airline_lower)',
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
          runtimeMappingsEditorValueArr: ['{', '  "rt_airline_lower": {', '    "type": "keyword",'],
          pivotAdvancedEditorValueArr: ['{', '  "group_by": {', '    "rt_airline_lower": {'],
          pivotAdvancedEditorValue: {
            group_by: {
              rt_airline_lower: {
                terms: {
                  field: 'rt_airline_lower',
                },
              },
            },
            aggregations: {
              'rt_responsetime_x_2.max': {
                max: {
                  field: 'rt_responsetime_x_2',
                },
              },
              'rt_responsetime_x_2.min': {
                min: {
                  field: 'rt_responsetime_x_2',
                },
              },
              'rt_responsetime_x_2.avg': {
                avg: {
                  field: 'rt_responsetime_x_2',
                },
              },
            },
          },
          transformPreview: {
            column: 0,
            values: [`aal`, 'aca', 'amx', 'asa', 'awe'],
          },
          row: {
            status: TRANSFORM_STATE.STOPPED,
            mode: 'batch',
            progress: '100',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          indexDataPreview: [
            { column: 4, name: 'rt_airline_lower' },
            { column: 5, name: 'rt_responsetime_x_2' },
          ],
          previewData: [
            { column: 0, name: 'rt_airline_lower', values: [`aal`, 'aca', 'amx', 'asa', 'awe'] },
            { column: 1, name: 'rt_responsetime_x_2.avg' },
            { column: 2, name: 'rt_responsetime_x_2.max' },
            { column: 3, name: 'rt_responsetime_x_2.min' },
          ],
          discoverRuntimeFields: [
            'rt_responsetime_x_2.avg',
            'rt_responsetime_x_2.max',
            'rt_responsetime_x_2.min',
          ],
          histogramCharts,
        },
      } as PivotTransformTestData,
      {
        type: 'latest',
        suiteTitle:
          'batch transform with unique rt_airline_lower and sort by time and runtime mappings',
        source: 'ft_farequote',
        uniqueKeys: [
          {
            identifier: 'rt_airline_lower',
            label: 'rt_airline_lower',
          },
        ],
        sortField: {
          identifier: '@timestamp',
          label: '@timestamp',
        },
        transformId: `fq_2_${Date.now()}`,
        transformDescription: 'batch transform with unique rt_airline_lower and sort by time',
        get destinationIndex(): string {
          return `user-latest-${this.transformId}`;
        },
        expected: {
          transformPreview: {
            column: 0,
            values: ['February 11th 2016, 23:59:54'],
          },
          row: {
            status: TRANSFORM_STATE.STOPPED,
            mode: 'batch',
            progress: '100',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          sourceIndex: 'ft_farequote',
          indexDataPreview: [
            { column: 2, name: 'airline' },
            { column: 4, name: 'rt_airline_lower' },
            { column: 5, name: 'rt_responsetime_x_2' },
          ],
          // The runtime mappings currently don't show up for Latest preview
          // so no need to check
          previewData: [],
          discoverRuntimeFields: ['rt_airline_lower', 'rt_responsetime_x_2'],
          histogramCharts,
        },
      } as LatestTransformTestData,
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          await transform.api.deleteIndices(testData.destinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(testData.destinationIndex);
        });

        it('loads the wizard for the source data', async () => {
          await transform.testExecution.logTestStep('loads the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('displays the stats bar');
          await transform.management.assertTransformStatsBarExists();

          await transform.testExecution.logTestStep('loads the source selection modal');
          await transform.management.startTransformCreation();

          await transform.testExecution.logTestStep('selects the source data');
          await transform.sourceSelection.selectSource(testData.source);
        });

        it('navigates through the wizard and sets all needed fields', async () => {
          await transform.testExecution.logTestStep('displays the define step');
          await transform.wizard.assertDefineStepActive();

          await transform.testExecution.logTestStep('has correct transform function selected');
          await transform.wizard.assertSelectedTransformFunction('pivot');

          await transform.testExecution.logTestStep('has correct runtime mappings settings');
          await transform.wizard.assertRuntimeMappingsEditorSwitchExists();
          await transform.wizard.assertRuntimeMappingsEditorSwitchCheckState(false);

          await transform.wizard.toggleRuntimeMappingsEditorSwitch(true);
          await transform.wizard.assertRuntimeMappingsEditorExists();
          await transform.wizard.assertRuntimeMappingsEditorContent(['']);

          await transform.testExecution.logTestStep('sets runtime mappings settings');
          await transform.wizard.setRuntimeMappingsEditorContent(JSON.stringify(runtimeMappings));
          await transform.wizard.applyRuntimeMappings();

          await transform.testExecution.logTestStep('loads the index preview');
          await transform.wizard.assertIndexPreviewLoaded();

          await transform.testExecution.logTestStep('shows the index preview');
          await transform.wizard.assertIndexPreview(
            testData.expected.indexPreview.columns,
            testData.expected.indexPreview.rows
          );
          for (const { column } of testData.expected.indexDataPreview) {
            await transform.wizard.assertIndexPreviewColumnValuesNotEmpty(column);
          }

          await transform.testExecution.logTestStep('displays an empty transform preview');
          await transform.wizard.assertTransformPreviewEmpty();

          await transform.testExecution.logTestStep('displays the query input');
          await transform.wizard.assertQueryInputExists();
          await transform.wizard.assertQueryValue('');

          await transform.testExecution.logTestStep('displays the advanced query editor switch');
          await transform.wizard.assertAdvancedQueryEditorSwitchExists();
          await transform.wizard.assertAdvancedQueryEditorSwitchCheckState(false);

          await transform.testExecution.logTestStep('enables the index preview histogram charts');
          await transform.wizard.enableIndexPreviewHistogramCharts(false);
          await transform.testExecution.logTestStep('displays the index preview histogram charts');
          await transform.wizard.assertIndexPreviewHistogramCharts(
            testData.expected.histogramCharts
          );

          if (isPivotTransformTestData(testData)) {
            await transform.testExecution.logTestStep('adds the group by entries');
            for (const [index, entry] of testData.groupByEntries.entries()) {
              await transform.wizard.assertGroupByInputExists();
              await transform.wizard.assertGroupByInputValue([]);
              await transform.wizard.addGroupByEntry(
                index,
                entry.identifier,
                entry.label,
                entry.intervalLabel
              );
            }

            await transform.testExecution.logTestStep('adds the aggregation entries');
            await transform.wizard.addAggregationEntries(testData.aggregationEntries);

            await transform.testExecution.logTestStep('displays the advanced pivot editor switch');
            await transform.wizard.assertAdvancedPivotEditorSwitchExists();
            await transform.wizard.assertAdvancedPivotEditorSwitchCheckState(false);

            await transform.testExecution.logTestStep('displays the advanced configuration');
            await transform.wizard.enableAdvancedPivotEditor();
            await transform.wizard.assertAdvancedPivotEditorContent(
              testData.expected.pivotAdvancedEditorValueArr
            );
          }

          if (isLatestTransformTestData(testData)) {
            await transform.testExecution.logTestStep('sets latest transform method');
            await transform.wizard.selectTransformFunction('latest');
            await transform.testExecution.logTestStep('adds unique keys');
            for (const { identifier, label } of testData.uniqueKeys) {
              await transform.wizard.assertUniqueKeysInputExists();
              await transform.wizard.assertUniqueKeysInputValue([]);
              await transform.wizard.addUniqueKeyEntry(identifier, label);
            }
            await transform.testExecution.logTestStep('sets the sort field');
            await transform.wizard.assertSortFieldInputExists();
            await transform.wizard.assertSortFieldInputValue('');
            await transform.wizard.setSortFieldValue(
              testData.sortField.identifier,
              testData.sortField.label
            );
          }

          await transform.testExecution.logTestStep('loads the transform preview');
          await transform.wizard.assertPivotPreviewLoaded();

          await transform.testExecution.logTestStep('shows the transform preview');
          await transform.wizard.assertPivotPreviewChartHistogramButtonMissing();
          for (const { column } of testData.expected.previewData) {
            await transform.wizard.assertPivotPreviewColumnValuesNotEmpty(column);
          }

          // cell virtualization means the last column is cutoff in the functional tests
          // https://github.com/elastic/eui/issues/4470
          // await transform.wizard.assertPivotPreviewColumnValues(
          //   testData.expected.transformPreview.column,
          //   testData.expected.transformPreview.values
          // );

          await transform.testExecution.logTestStep('loads the details step');
          await transform.wizard.advanceToDetailsStep();

          await transform.testExecution.logTestStep('inputs the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);

          await transform.testExecution.logTestStep('inputs the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);

          await transform.testExecution.logTestStep('inputs the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);

          await transform.testExecution.logTestStep('displays the create data view switch');
          await transform.wizard.assertCreateIndexPatternSwitchExists();
          await transform.wizard.assertCreateIndexPatternSwitchCheckState(true);

          await transform.testExecution.logTestStep('displays the continuous mode switch');
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);

          await transform.testExecution.logTestStep('loads the create step');
          await transform.wizard.advanceToCreateStep();

          await transform.testExecution.logTestStep('displays the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await transform.wizard.assertCreateAndStartButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the create button');
          await transform.wizard.assertCreateButtonExists();
          await transform.wizard.assertCreateButtonEnabled(true);

          await transform.testExecution.logTestStep('displays the copy to clipboard button');
          await transform.wizard.assertCopyToClipboardButtonExists();
          await transform.wizard.assertCopyToClipboardButtonEnabled(true);
        });

        it('runs the transform and displays it correctly in Discover page', async () => {
          await transform.testExecution.logTestStep('creates the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep('starts the transform and finishes processing');
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();

          await transform.testExecution.logTestStep('redirects to Discover page');
          await transform.wizard.redirectToDiscover();

          if (isLatestTransformTestData(testData)) {
            const fromTime = 'Feb 7, 2016 @ 00:00:00.000';
            const toTime = 'Feb 11, 2016 @ 23:59:54.000';
            await transform.wizard.setDiscoverTimeRange(fromTime, toTime);
          }

          await transform.testExecution.logTestStep(
            'Discover page contains all the created runtime fields'
          );

          for (const runtimeAgg of testData.expected.discoverRuntimeFields) {
            await transform.wizard.assertDiscoverContainField(runtimeAgg);
          }
        });
      });
    }
  });
}
