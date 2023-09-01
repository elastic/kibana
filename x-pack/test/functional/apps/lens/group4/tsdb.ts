/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { partition } from 'lodash';
import moment from 'moment';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

const TEST_DOC_COUNT = 100;
const TIME_PICKER_FORMAT = 'MMM D, YYYY [@] HH:mm:ss.SSS';
const timeSeriesMetrics: Record<string, 'gauge' | 'counter'> = {
  bytes_gauge: 'gauge',
  bytes_counter: 'counter',
};
const timeSeriesDimensions = ['request', 'url'];

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

function getDataMapping(
  { tsdb, removeTSDBFields }: { tsdb: boolean; removeTSDBFields?: boolean } = {
    tsdb: false,
  }
): Record<string, MappingProperty> {
  const dataStreamMapping: Record<string, MappingProperty> = {
    '@timestamp': {
      type: 'date',
    },
    agent: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    bytes: {
      type: 'long',
    },
    bytes_counter: {
      type: 'long',
    },
    bytes_gauge: {
      type: 'long',
    },
    clientip: {
      type: 'ip',
    },
    event: {
      properties: {
        dataset: {
          type: 'keyword',
        },
      },
    },
    extension: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    geo: {
      properties: {
        coordinates: {
          type: 'geo_point',
        },
        dest: {
          type: 'keyword',
        },
        src: {
          type: 'keyword',
        },
        srcdest: {
          type: 'keyword',
        },
      },
    },
    host: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    index: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    ip: {
      type: 'ip',
    },
    machine: {
      properties: {
        os: {
          fields: {
            keyword: {
              ignore_above: 256,
              type: 'keyword',
            },
          },
          type: 'text',
        },
        ram: {
          type: 'long',
        },
      },
    },
    memory: {
      type: 'double',
    },
    message: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    phpmemory: {
      type: 'long',
    },
    referer: {
      type: 'keyword',
    },
    request: {
      type: 'keyword',
    },
    response: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    tags: {
      fields: {
        keyword: {
          ignore_above: 256,
          type: 'keyword',
        },
      },
      type: 'text',
    },
    timestamp: {
      path: '@timestamp',
      type: 'alias',
    },
    url: {
      type: 'keyword',
    },
    utc_time: {
      type: 'date',
    },
  };

  if (tsdb) {
    // augment the current mapping
    for (const [fieldName, fieldMapping] of Object.entries(dataStreamMapping || {})) {
      if (
        timeSeriesMetrics[fieldName] &&
        (fieldMapping.type === 'double' || fieldMapping.type === 'long')
      ) {
        fieldMapping.time_series_metric = timeSeriesMetrics[fieldName];
      }

      if (timeSeriesDimensions.includes(fieldName) && fieldMapping.type === 'keyword') {
        fieldMapping.time_series_dimension = true;
      }
    }
  } else if (removeTSDBFields) {
    for (const fieldName of Object.keys(timeSeriesMetrics)) {
      delete dataStreamMapping[fieldName];
    }
  }
  return dataStreamMapping;
}

function sumFirstNValues(n: number, bars: Array<{ y: number }>): number {
  const indexes = Array(n)
    .fill(1)
    .map((_, i) => i);
  let countSum = 0;
  for (const index of indexes) {
    if (bars[index]) {
      countSum += bars[index].y;
    }
  }
  return countSum;
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'lens', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const log = getService('log');
  const dataStreams = getService('dataStreams');
  const elasticChart = getService('elasticChart');
  const indexPatterns = getService('indexPatterns');
  const esArchiver = getService('esArchiver');
  const comboBox = getService('comboBox');

  const createDocs = async (
    esIndex: string,
    { isStream, removeTSDBFields }: { isStream: boolean; removeTSDBFields?: boolean },
    startTime: string
  ) => {
    log.info(
      `Adding ${TEST_DOC_COUNT} to ${esIndex} with starting time from ${moment
        .utc(startTime, TIME_PICKER_FORMAT)
        .format(TIME_PICKER_FORMAT)} to ${moment
        .utc(startTime, TIME_PICKER_FORMAT)
        .add(2 * TEST_DOC_COUNT, 'seconds')
        .format(TIME_PICKER_FORMAT)}`
    );
    const docs = Array<TestDoc>(TEST_DOC_COUNT)
      .fill(testDocTemplate)
      .map((templateDoc, i) => {
        const timestamp = moment
          .utc(startTime, TIME_PICKER_FORMAT)
          .add(TEST_DOC_COUNT + i, 'seconds')
          .format();
        const doc: TestDoc = {
          ...templateDoc,
          '@timestamp': timestamp,
          utc_time: timestamp,
          bytes_gauge: Math.floor(Math.random() * 10000 * i),
          bytes_counter: 5000,
        };
        if (removeTSDBFields) {
          for (const field of Object.keys(timeSeriesMetrics)) {
            delete doc[field];
          }
        }
        return doc;
      });

    const result = await es.bulk(
      {
        index: esIndex,
        body: docs.map((d) => `{"${isStream ? 'create' : 'index'}": {}}\n${JSON.stringify(d)}\n`),
      },
      { meta: true }
    );

    const res = result.body;

    if (res.errors) {
      const resultsWithErrors = res.items
        .filter(({ index }) => index?.error)
        .map(({ index }) => index?.error);
      for (const error of resultsWithErrors) {
        log.error(`Error: ${JSON.stringify(error)}`);
      }
      const [indexExists, dataStreamExists] = await Promise.all([
        es.indices.exists({ index: esIndex }),
        es.indices.getDataStream({ name: esIndex }),
      ]);
      log.debug(`Index exists: ${indexExists} - Data stream exists: ${dataStreamExists}`);
    }
    log.info(`Indexed ${res.items.length} test data docs.`);
  };

  // Failing ES promotion: https://github.com/elastic/kibana/issues/163970
  describe.skip('lens tsdb', function () {
    const tsdbIndex = 'kibana_sample_data_logstsdb';
    const tsdbDataView = tsdbIndex;
    const tsdbEsArchive = 'test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb';
    const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
    const toTime = 'Jun 16, 2023 @ 00:00:00.000';

    before(async () => {
      log.info(`loading ${tsdbIndex} index...`);
      await esArchiver.loadIfNeeded(tsdbEsArchive);
      log.info(`creating a data view for "${tsdbDataView}"...`);
      await indexPatterns.create(
        {
          title: tsdbDataView,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      log.info(`updating settings to use the "${tsdbDataView}" dataView...`);
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}" }`,
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await es.indices.delete({ index: [tsdbIndex] });
    });

    describe('downsampling', () => {
      const downsampleDataView: { index: string; dataView: string } = { index: '', dataView: '' };
      before(async () => {
        const downsampledTargetIndex = await dataStreams.downsampleTSDBIndex(tsdbIndex, {
          isStream: false,
        });
        downsampleDataView.index = downsampledTargetIndex;
        downsampleDataView.dataView = `${tsdbIndex},${downsampledTargetIndex}`;

        log.info(`creating a data view for "${downsampleDataView.dataView}"...`);
        await indexPatterns.create(
          {
            title: downsampleDataView.dataView,
            timeFieldName: '@timestamp',
          },
          { override: true }
        );
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

      // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/163971
      describe.skip('for rolled up metric (downsampled)', () => {
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

    describe('time series special field types support', () => {
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

      describe('show time series dimension groups within breakdown', () => {
        it('should show the time series dimension group on field picker when configuring a breakdown', async () => {
          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'date_histogram',
            field: '@timestamp',
          });

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'min',
            field: 'bytes_counter',
          });

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
            operation: 'terms',
            keepOpen: true,
          });

          const list = await comboBox.getOptionsList('indexPattern-dimension-field');
          expect(list).to.contain('Time series dimensions');
          await PageObjects.lens.closeDimensionEditor();
        });

        it("should not show the time series dimension group on field picker if it's not a breakdown", async () => {
          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'min',
            field: 'bytes_counter',
          });

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'date_histogram',
            keepOpen: true,
          });
          const list = await comboBox.getOptionsList('indexPattern-dimension-field');
          expect(list).to.not.contain('Time series dimensions');
          await PageObjects.lens.closeDimensionEditor();
        });
      });
    });

    describe('Scenarios with changing stream type', () => {
      const now = moment().utc();
      const fromMoment = now.clone().subtract(1, 'hour');
      const toMoment = now.clone();
      const fromTimeForScenarios = fromMoment.format(TIME_PICKER_FORMAT);
      const toTimeForScenarios = toMoment.format(TIME_PICKER_FORMAT);

      const getScenarios = (
        initialIndex: string
      ): Array<{
        name: string;
        indexes: Array<{
          index: string;
          create?: boolean;
          downsample?: boolean;
          tsdb?: boolean;
          removeTSDBFields?: boolean;
        }>;
      }> => [
        {
          name: 'Dataview with no additional stream/index',
          indexes: [{ index: initialIndex }],
        },
        {
          name: 'Dataview with an additional regular index',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
          ],
        },
        {
          name: 'Dataview with an additional downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'tsdb_index_2', create: true, tsdb: true, downsample: true },
          ],
        },
        {
          name: 'Dataview with additional regular index and a downsampled TSDB stream',
          indexes: [
            { index: initialIndex },
            { index: 'regular_index', create: true, removeTSDBFields: true },
            { index: 'tsdb_index_2', create: true, tsdb: true, downsample: true },
          ],
        },
        {
          name: 'Dataview with an additional TSDB stream',
          indexes: [{ index: initialIndex }, { index: 'tsdb_index_2', create: true, tsdb: true }],
        },
      ];

      function runTestsForEachScenario(
        initialIndex: string,
        testingFn: (
          indexes: Array<{
            index: string;
            create?: boolean;
            downsample?: boolean;
            tsdb?: boolean;
            removeTSDBFields?: boolean;
          }>
        ) => void
      ): void {
        for (const { name, indexes } of getScenarios(initialIndex)) {
          describe(name, () => {
            let dataViewName: string;
            let downsampledTargetIndex: string = '';

            before(async () => {
              for (const { index, create, downsample, tsdb, removeTSDBFields } of indexes) {
                if (create) {
                  if (tsdb) {
                    await dataStreams.createDataStream(
                      index,
                      getDataMapping({ tsdb, removeTSDBFields }),
                      tsdb
                    );
                  } else {
                    log.info(`creating a index "${index}" with mapping...`);
                    await es.indices.create({
                      index,
                      mappings: {
                        properties: getDataMapping({ tsdb: Boolean(tsdb), removeTSDBFields }),
                      },
                    });
                  }
                  // add data to the newly created index
                  await createDocs(
                    index,
                    { isStream: Boolean(tsdb), removeTSDBFields },
                    fromTimeForScenarios
                  );
                }
                if (downsample) {
                  downsampledTargetIndex = await dataStreams.downsampleTSDBIndex(index, {
                    isStream: Boolean(tsdb),
                  });
                }
              }
              dataViewName = `${indexes.map(({ index }) => index).join(',')}${
                downsampledTargetIndex ? `,${downsampledTargetIndex}` : ''
              }`;
              log.info(`creating a data view for "${dataViewName}"...`);
              await indexPatterns.create(
                {
                  title: dataViewName,
                  timeFieldName: '@timestamp',
                },
                { override: true }
              );
              await PageObjects.common.navigateToApp('lens');
              await elasticChart.setNewChartUiDebugFlag(true);
              // go to the
              await PageObjects.lens.goToTimeRange(
                fromTimeForScenarios,
                moment
                  .utc(toTimeForScenarios, TIME_PICKER_FORMAT)
                  .add(2, 'hour')
                  .format(TIME_PICKER_FORMAT) // consider also new documents
              );
            });

            after(async () => {
              for (const { index, create, tsdb } of indexes) {
                if (create) {
                  if (tsdb) {
                    await dataStreams.deleteDataStream(index);
                  } else {
                    log.info(`deleting the index "${index}"...`);
                    await es.indices.delete({
                      index,
                    });
                  }
                }
                // no need to cleant he specific downsample index as everything linked to the stream
                // is cleaned up automatically
              }
            });

            beforeEach(async () => {
              await PageObjects.lens.switchDataPanelIndexPattern(dataViewName);
              await PageObjects.lens.removeLayer();
            });

            testingFn(indexes);
          });
        }
      }

      describe('Data-stream upgraded to TSDB scenarios', () => {
        const streamIndex = 'data_stream';
        // rollover does not allow to change name, it will just change backing index underneath
        const streamConvertedToTsdbIndex = streamIndex;

        before(async () => {
          log.info(`Creating "${streamIndex}" data stream...`);
          await dataStreams.createDataStream(streamIndex, getDataMapping(), false);

          // add some data to the stream
          await createDocs(streamIndex, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${streamIndex}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(`Upgrade "${streamIndex}" stream to TSDB...`);

          const tsdbMapping = getDataMapping({ tsdb: true });
          await dataStreams.upgradeStreamToTSDB(streamIndex, tsdbMapping);
          log.info(
            `Add more data to new "${streamConvertedToTsdbIndex}" dataView (now with TSDB backing index)...`
          );
          // add some more data when upgraded
          await createDocs(streamConvertedToTsdbIndex, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(streamIndex);
        });

        runTestsForEachScenario(streamConvertedToTsdbIndex, (indexes) => {
          it('should detect the data stream has now been upgraded to TSDB', async () => {
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
              keepOpen: true,
            });

            expect(
              testSubjects.exists(`lns-indexPatternDimension-average incompatible`, {
                timeout: 500,
              })
            ).to.eql(false);
            await PageObjects.lens.closeDimensionEditor();
          });

          it(`should visualize a date histogram chart for counter field`, async () => {
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            // check the counter field works
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
            });
            // and also that the count of documents should be "indexes.length" times overall
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'count',
            });

            await PageObjects.lens.waitForVisualization('xyVisChart');
            const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
            const counterBars = data.bars![0].bars;
            const countBars = data.bars![1].bars;

            log.info('Check counter data before the upgrade');
            // check there's some data before the upgrade
            expect(counterBars[0].y).to.eql(5000);
            log.info('Check counter data after the upgrade');
            // check there's some data after the upgrade
            expect(counterBars[counterBars.length - 1].y).to.eql(5000);

            log.info('Check count before the upgrade');
            const columnsToCheck = countBars.length / 2;
            // Before the upgrade the count is N times the indexes
            expect(sumFirstNValues(columnsToCheck, countBars)).to.eql(
              indexes.length * TEST_DOC_COUNT
            );
            log.info('Check count after the upgrade');
            // later there are only documents for the upgraded stream
            expect(sumFirstNValues(columnsToCheck, [...countBars].reverse())).to.eql(
              TEST_DOC_COUNT
            );
          });
        });
      });

      describe('TSDB downgraded to regular data stream scenarios', () => {
        const tsdbStream = 'tsdb_stream_dowgradable';
        // rollover does not allow to change name, it will just change backing index underneath
        const tsdbConvertedToStream = tsdbStream;

        before(async () => {
          log.info(`Creating "${tsdbStream}" data stream...`);
          await dataStreams.createDataStream(tsdbStream, getDataMapping({ tsdb: true }), true);

          // add some data to the stream
          await createDocs(tsdbStream, { isStream: true }, fromTimeForScenarios);

          log.info(`Update settings for "${tsdbStream}" dataView...`);
          await kibanaServer.uiSettings.update({
            'dateFormat:tz': 'UTC',
            'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
          });
          log.info(
            `Dowgrade "${tsdbStream}" stream into regular stream "${tsdbConvertedToStream}"...`
          );

          await dataStreams.downgradeTSDBtoStream(tsdbStream, getDataMapping({ tsdb: true }));
          log.info(`Add more data to new "${tsdbConvertedToStream}" dataView (no longer TSDB)...`);
          // add some more data when upgraded
          await createDocs(tsdbConvertedToStream, { isStream: true }, toTimeForScenarios);
        });

        after(async () => {
          await dataStreams.deleteDataStream(tsdbConvertedToStream);
        });

        runTestsForEachScenario(tsdbConvertedToStream, (indexes) => {
          it('should keep TSDB restrictions only if a tsdb stream is in the dataView mix', async () => {
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });

            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'min',
              field: `bytes_counter`,
              keepOpen: true,
            });

            expect(
              testSubjects.exists(`lns-indexPatternDimension-average incompatible`, {
                timeout: 500,
              })
            ).to.eql(indexes.some(({ tsdb }) => tsdb));
            await PageObjects.lens.closeDimensionEditor();
          });

          it(`should visualize a date histogram chart for counter field`, async () => {
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });
            // just check the data is shown
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'count',
            });

            await PageObjects.lens.waitForVisualization('xyVisChart');
            const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
            const bars = data.bars![0].bars;
            const columnsToCheck = bars.length / 2;
            log.info('Check count before the downgrade');
            // Before the upgrade the count is N times the indexes
            expect(sumFirstNValues(columnsToCheck, bars)).to.eql(indexes.length * TEST_DOC_COUNT);
            log.info('Check count after the downgrade');
            // later there are only documents for the upgraded stream
            expect(sumFirstNValues(columnsToCheck, [...bars].reverse())).to.eql(TEST_DOC_COUNT);
          });

          it('should visualize data when moving the time window around the downgrade moment', async () => {
            // check after the downgrade
            await PageObjects.lens.goToTimeRange(
              moment
                .utc(fromTimeForScenarios, TIME_PICKER_FORMAT)
                .subtract(1, 'hour')
                .format(TIME_PICKER_FORMAT),
              moment
                .utc(fromTimeForScenarios, TIME_PICKER_FORMAT)
                .add(1, 'hour')
                .format(TIME_PICKER_FORMAT) // consider only new documents
            );

            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
              operation: 'date_histogram',
              field: '@timestamp',
            });
            await PageObjects.lens.configureDimension({
              dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
              operation: 'count',
            });

            await PageObjects.lens.waitForVisualization('xyVisChart');
            const dataBefore = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
            const barsBefore = dataBefore.bars![0].bars;
            expect(barsBefore.some(({ y }) => y)).to.eql(true);

            // check after the downgrade
            await PageObjects.lens.goToTimeRange(
              moment
                .utc(toTimeForScenarios, TIME_PICKER_FORMAT)
                .add(1, 'second')
                .format(TIME_PICKER_FORMAT),
              moment
                .utc(toTimeForScenarios, TIME_PICKER_FORMAT)
                .add(2, 'hour')
                .format(TIME_PICKER_FORMAT) // consider also new documents
            );

            await PageObjects.lens.waitForVisualization('xyVisChart');
            const dataAfter = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
            const barsAfter = dataAfter.bars![0].bars;
            expect(barsAfter.some(({ y }) => y)).to.eql(true);
          });
        });
      });
    });
  });
}
