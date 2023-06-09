/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { partition } from 'lodash';
import { createTSDBHelper } from './_tsdb_utils';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'lens', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const TSDBHelper = createTSDBHelper({ getService });

  describe('lens tsdb', function () {
    const testIndex = 'kibana_sample_data_logstsdb';
    const testDataView = testIndex;
    const testEsArchive = 'test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';

    before(async () => {
      await TSDBHelper.loadIndex(testIndex, testEsArchive);
      await TSDBHelper.configureDataView(testIndex, '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51');
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
      });
    });

    after(async () => {
      await TSDBHelper.deleteIndexAndResetSettings(testIndex);
    });

    describe('downsampling', () => {
      let downsampleDataView: { index: string; dataView: string };
      before(async () => {
        downsampleDataView = await TSDBHelper.downsampleTSDBIndex(testIndex);
        await TSDBHelper.configureDataView(downsampleDataView.dataView);
      });

      after(async () => {
        await es.indices.delete({ index: [downsampleDataView.index] });
      });

      describe('for regular metric', () => {
        it('defaults to median for non-rolled up metric', async () => {
          await PageObjects.common.navigateToApp('lens');
          await PageObjects.lens.waitForField('bytes_gauge');
          await PageObjects.lens.dragFieldToWorkspace('bytes_gauge', 'xyVisChart');
          expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Median of bytes_gauge'
          );
        });

        it('does not show a warning', async () => {
          await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
          await testSubjects.missingOrFail('median-partial-warning');
          await PageObjects.lens.assertNoEditorWarning();
          await PageObjects.lens.closeDimensionEditor();
        });
      });

      describe('for rolled up metric', () => {
        it('defaults to average for rolled up metric', async () => {
          await PageObjects.lens.switchDataPanelIndexPattern(downsampleDataView.dataView);
          await PageObjects.lens.removeLayer();
          await PageObjects.lens.waitForField('bytes_gauge');
          await PageObjects.lens.dragFieldToWorkspace('bytes_gauge', 'xyVisChart');
          expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
            'Average of bytes_gauge'
          );
        });
        it('shows warnings in editor when using median', async () => {
          await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel');
          await testSubjects.existOrFail('median-partial-warning');
          await testSubjects.click('lns-indexPatternDimension-median');
          await PageObjects.lens.waitForVisualization('xyVisChart');
          await PageObjects.lens.assertMessageListContains(
            'Median of bytes_gauge uses a function that is unsupported by rolled up data. Select a different function or change the time range.',
            'warning'
          );
        });
        it('shows warnings in dashboards as well', async () => {
          await PageObjects.lens.save('New', false, false, false, 'new');

          await PageObjects.dashboard.waitForRenderComplete();
          await PageObjects.lens.assertMessageListContains(
            'Median of bytes_gauge uses a function that is unsupported by rolled up data. Select a different function or change the time range.',
            'warning'
          );
        });
      });
    });

    describe('field types support', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('lens');
        await PageObjects.lens.switchDataPanelIndexPattern(testDataView);
        await PageObjects.lens.goToTimeRange();
      });

      afterEach(async () => {
        await PageObjects.lens.removeLayer();
      });

      // skip count for now as it's a special function and will
      // change automatically the unsupported field to Records when detected
      const allOperations = [
        'average',
        'max',
        'last_value',
        'median',
        'percentile',
        'percentile_rank',
        'standard_deviation',
        'sum',
        'unique_count',
      ];
      const counterFieldsSupportedOps = ['min', 'max', 'counter_rate', 'last_value'];
      const gaugeFieldsSupportedOps = allOperations;

      const operationsByFieldSupport = allOperations.map((name) => ({
        name,
        // Quick way to make it match the UI name
        label: `${name[0].toUpperCase()}${name.slice(1).replace('_', ' ')}`,
        counter: counterFieldsSupportedOps.includes(name),
        gauge: gaugeFieldsSupportedOps.includes(name),
      }));

      for (const fieldType of ['counter', 'gauge'] as const) {
        const [supportedOperations, unsupportedOperatons] = partition(
          operationsByFieldSupport,
          (op) => op[fieldType]
        );
        if (supportedOperations.length) {
          it(`should allow operations when supported by ${fieldType} field type`, async () => {
            // Counter rate requires a date histogram dimension configured to work
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            // minimum supports all tsdb field types
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_${fieldType}`,
              keepOpen: true,
            });

            // now check if the provided function has no incompatibility tooltip
            for (const supportedOp of supportedOperations) {
              expect(
                testSubjects.exists(`lns-indexPatternDimension-${supportedOp.name} incompatible`, {
                  timeout: 500,
                })
              ).to.eql(supportedOp[fieldType]);
            }

            for (const supportedOp of supportedOperations) {
              // try to change to the provided function and check all is ok
              await PageObjects.lens.selectOperation(supportedOp.name);

              expect(
                await find.existsByCssSelector(
                  '[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText'
                )
              ).to.be(false);

              // return in a clean state before checking the next operation
              await PageObjects.lens.selectOperation('min');
            }
            await PageObjects.lens.closeDimensionEditor();
          });
        }
        if (unsupportedOperatons.length) {
          it(`should notify the incompatibility of unsupported operations for the ${fieldType} field type`, async () => {
            // Counter rate requires a date histogram dimension configured to work
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            // minimum supports all tsdb field types
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_${fieldType}`,
              keepOpen: true,
            });

            // now check if the provided function has the incompatibility tooltip
            for (const unsupportedOp of unsupportedOperatons) {
              expect(
                testSubjects.exists(
                  `lns-indexPatternDimension-${unsupportedOp.name} incompatible`,
                  {
                    timeout: 500,
                  }
                )
              ).to.eql(!unsupportedOp[fieldType]);
            }

            for (const unsupportedOp of unsupportedOperatons) {
              // try to change to the provided function and check if it's in an incompatibility state
              await PageObjects.lens.selectOperation(unsupportedOp.name, true);

              const fieldSelectErrorEl = await find.byCssSelector(
                '[data-test-subj="indexPattern-field-selection-row"] .euiFormErrorText'
              );

              expect(await fieldSelectErrorEl.getVisibleText()).to.be(
                'This field does not work with the selected function.'
              );

              // return in a clean state before checking the next operation
              await PageObjects.lens.selectOperation('min');
            }
            await PageObjects.lens.closeDimensionEditor();
          });
        }
      }
    });
  });
}
