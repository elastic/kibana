/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { ToolingLog } from '@kbn/tooling-log';
import moment from 'moment';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export const TEST_DOC_COUNT = 100;
export const TIME_PICKER_FORMAT = 'MMM D, YYYY [@] HH:mm:ss.SSS';
export const timeSeriesMetrics: Record<string, 'gauge' | 'counter'> = {
  bytes_gauge: 'gauge',
  bytes_counter: 'counter',
};
export const timeSeriesDimensions = ['request', 'url'];
export const logsDBSpecialFields = ['host'];

export const sharedESArchive =
  'test/functional/fixtures/es_archiver/kibana_sample_data_logs_logsdb';
export const fromTime = 'Apr 16, 2023 @ 00:00:00.000';
export const toTime = 'Jun 16, 2023 @ 00:00:00.000';

export type TestDoc = Record<string, string | string[] | number | null | Record<string, unknown>>;

export const testDocTemplate: TestDoc = {
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
  host: { name: 'artifacts.elastic.co' },
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

export function getDataMapping(
  {
    tsdb,
    removeTSDBFields,
    removeLogsDBFields,
  }: { tsdb: boolean; removeTSDBFields?: boolean; removeLogsDBFields?: boolean } = {
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
      properties: {
        name: {
          type: 'keyword',
        },
      },
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
  if (removeLogsDBFields) {
    for (const fieldName of logsDBSpecialFields) {
      delete dataStreamMapping[fieldName];
    }
  }
  return dataStreamMapping;
}

export function sumFirstNValues(n: number, bars: Array<{ y: number }> | undefined): number {
  const indexes = Array(n)
    .fill(1)
    .map((_, i) => i);
  let countSum = 0;
  for (const index of indexes) {
    if (bars?.[index]) {
      countSum += bars[index].y;
    }
  }
  return countSum;
}

export const getDocsGenerator =
  (log: ToolingLog, es: Client) =>
  async (
    esIndex: string,
    {
      isStream,
      removeTSDBFields,
      removeLogsDBFields,
    }: { isStream: boolean; removeTSDBFields?: boolean; removeLogsDBFields?: boolean },
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
        if (removeLogsDBFields) {
          for (const field of logsDBSpecialFields) {
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

export interface ScenarioIndexes {
  index: string;
  create?: boolean;
  downsample?: boolean;
  tsdb?: boolean;
  removeTSDBFields?: boolean;
  removeLogsDBFields?: boolean;
  logsdb?: boolean;
}
type GetScenarioFn = (initialIndex: string) => Array<{
  name: string;
  indexes: ScenarioIndexes[];
}>;

export function setupScenarioRunner(
  getService: FtrProviderContext['getService'],
  getPageObjects: FtrProviderContext['getPageObjects'],
  getScenario: GetScenarioFn
) {
  const now = moment().utc();
  const fromMoment = now.clone().subtract(1, 'hour');
  const toMoment = now.clone();
  const fromTimeForScenarios = fromMoment.format(TIME_PICKER_FORMAT);
  const toTimeForScenarios = toMoment.format(TIME_PICKER_FORMAT);

  function runTestsForEachScenario(
    initialIndex: string,
    testingFn: (indexes: ScenarioIndexes[]) => void
  ): void {
    const { common, lens } = getPageObjects(['common', 'lens', 'dashboard']);
    const es = getService('es');
    const log = getService('log');
    const dataStreams = getService('dataStreams');
    const elasticChart = getService('elasticChart');
    const indexPatterns = getService('indexPatterns');
    const createDocs = getDocsGenerator(log, es);

    for (const { name, indexes } of getScenario(initialIndex)) {
      describe(name, () => {
        let dataViewName: string;
        let downsampledTargetIndex: string = '';

        before(async () => {
          for (const {
            index,
            create,
            downsample,
            tsdb,
            removeTSDBFields,
            removeLogsDBFields,
            logsdb,
          } of indexes) {
            // Validate the scenario config
            if (logsdb && tsdb) {
              expect().fail('Cannot create a scenario with both tsdb and logsdb');
            }
            if (downsample && !tsdb) {
              expect().fail('Cannot create a scenario with downsampled stream without tsdb');
            }
            // Kick off the creation
            const isStream = Boolean(tsdb || logsdb);
            if (create) {
              if (isStream) {
                await dataStreams.createDataStream(
                  index,
                  getDataMapping({
                    tsdb: Boolean(tsdb),
                    removeTSDBFields: Boolean(removeTSDBFields || logsdb),
                    removeLogsDBFields,
                  }),
                  tsdb ? 'tsdb' : 'logsdb'
                );
              } else {
                log.info(`creating a index "${index}" with mapping...`);
                await es.indices.create({
                  index,
                  mappings: {
                    properties: getDataMapping({
                      tsdb: Boolean(tsdb),
                      removeTSDBFields,
                      removeLogsDBFields,
                    }),
                  },
                });
              }
              // add data to the newly created index
              await createDocs(
                index,
                { isStream, removeTSDBFields, removeLogsDBFields },
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
          await common.navigateToApp('lens');
          await elasticChart.setNewChartUiDebugFlag(true);
          // go to the
          await lens.goToTimeRange(
            fromTimeForScenarios,
            moment
              .utc(toTimeForScenarios, TIME_PICKER_FORMAT)
              .add(2, 'hour')
              .format(TIME_PICKER_FORMAT) // consider also new documents
          );
        });

        after(async () => {
          for (const { index, create, tsdb, logsdb } of indexes) {
            if (create) {
              if (tsdb || logsdb) {
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
          await lens.switchDataPanelIndexPattern(dataViewName);
          await lens.removeLayer();
        });

        testingFn(indexes);
      });
    }
  }

  return { runTestsForEachScenario, fromTimeForScenarios, toTimeForScenarios };
}
