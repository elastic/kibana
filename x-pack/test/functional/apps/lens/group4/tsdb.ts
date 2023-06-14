/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { partition } from 'lodash';
import moment from 'moment';
import { createTSDBHelper } from './_tsdb_utils';
import { FtrProviderContext } from '../../../ftr_provider_context';

const TEST_DOC_COUNT = 100;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'lens', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const TSDBHelper = createTSDBHelper({ getService });

  const createDocs = async (esIndex: string, startTime: string) => {
    type TestDoc = Record<string, string | string[] | number | null | Record<string, unknown>>;
    const testDocTemplate: TestDoc = {
      agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
      bytes: 6219,
      clientip: '223.87.60.27',
      extension: 'deb',
      geo: {
        srcdest: 'US:US',
        src: 'US',
        dest: 'US',
        coordinates: { lat: 39.41042861, lon: -88.8454325 },
      },
      host: 'artifacts.elastic.co',
      index: 'kibana_sample_data_logs',
      ip: '223.87.60.27',
      machine: { ram: 8589934592, os: 'win 8' },
      memory: null,
      message:
        '223.87.60.27 - - [2018-07-22T00:39:02.912Z] "GET /elasticsearch/elasticsearch-6.3.2.deb_1 HTTP/1.1" 200 6219 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
      phpmemory: null,
      referer: 'http://twitter.com/success/wendy-lawrence',
      request: '/elasticsearch/elasticsearch-6.3.2.deb',
      response: 200,
      tags: ['success', 'info'],
      '@timestamp': '2018-07-22T00:39:02.912Z',
      url: 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.3.2.deb_1',
      utc_time: '2018-07-22T00:39:02.912Z',
      event: { dataset: 'sample_web_logs' },
      bytes_gauge: 0,
      bytes_counter: 0,
    };

    const docs = Array<TestDoc>(TEST_DOC_COUNT)
      .fill(testDocTemplate)
      .map((templateDoc, i) => {
        const timestamp = moment
          .utc(startTime)
          .add(TEST_DOC_COUNT + i, 'seconds')
          .format();
        return {
          ...templateDoc,
          '@timestamp': timestamp,
          utc_time: timestamp,
          bytes_gauge: Math.floor(Math.random() * 10000 * i),
          bytes_counter: i * 1000,
        };
      });

    const res = await es.bulk({
      index: esIndex,
      body: docs.map((d) => `{"index": {}}\n${JSON.stringify(d)}\n`),
    });

    log.info(`Indexed ${res.items.length} test data docs.`);
  };

  describe('lens tsdb', function () {
    const tsdbIndex = 'kibana_sample_data_logstsdb';
    const tsdbDataView = tsdbIndex;
    const tsdbEsArchive = 'test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      await TSDBHelper.loadIndex(tsdbIndex, tsdbEsArchive);
      await TSDBHelper.configureDataView(tsdbDataView, '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51');
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': `{ "from": ${fromTime}, "to": ${toTime} }`,
      });
    });

    after(async () => {
      await TSDBHelper.deleteIndexAndResetSettings(tsdbIndex);
    });

    describe('downsampling', () => {
      let downsampleDataView: { index: string; dataView: string };
      before(async () => {
        downsampleDataView = await TSDBHelper.downsampleTSDBIndex(tsdbIndex);
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
        await PageObjects.lens.switchDataPanelIndexPattern(tsdbDataView);
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

    describe('Data-stream upgraded to TSDB', () => {
      const streamIndex = 'data_stream';
      const streamDataView = streamIndex;
      const streamEsArchive = 'test/functional/fixtures/es_archiver/data_stream';

      before(async () => {
        await TSDBHelper.loadIndex(streamIndex, streamEsArchive);
        await kibanaServer.uiSettings.update({
          'dateFormat:tz': 'UTC',
          'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
        });
        await TSDBHelper.upgradeStreamToTSDB(
          streamIndex,
          `${streamIndex}-tsdb`,
          { bytes_gauge: 'gauge', bytes_counter: 'counter' },
          ['request', 'url']
        );
        // add some more data when upgraded
        await createDocs(streamIndex, toTime);
        // go to the
        await PageObjects.lens.goToTimeRange(
          fromTime,
          moment
            .utc(toTime)
            .add(TEST_DOC_COUNT + 1, 'seconds')
            .format() // consider also new documents
        );
      });

      after(async () => {
        await TSDBHelper.deleteIndexAndResetSettings(streamIndex);
      });

      describe('dataview contains only upgraded stream', () => {
        before(async () => {
          await TSDBHelper.configureDataView(`${streamDataView}-tsdb`);
        });

        after(async () => {
          await TSDBHelper.unloadDataView('');
        });

        beforeEach(async () => {
          await PageObjects.lens.removeLayer();
        });

        for (const fieldType of ['gauge', 'counter']) {
          it(`should visualize a date histogram chart for ${fieldType} field`, async () => {
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_${fieldType}`,
            });
            await PageObjects.lens.waitForVisualization('xyVisChart');
          });
        }
      });
      describe('dataView contains upgraded stream + another tsdb index', () => {
        before(async () => {
          await TSDBHelper.configureDataView(`${streamDataView},${streamDataView}-tsdb`);
        });
        after(async () => {
          await TSDBHelper.unloadDataView('');
        });
      });
      describe('dataView contains upgraded stream + simple stream', () => {});
      describe('dataView contains upgraded stream + downsampled tsdb index', () => {});
    });
  });
}
