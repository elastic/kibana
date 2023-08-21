/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-utils';

import { FtrProviderContext } from '../../ftr_provider_context';

export interface GeneratedDoc {
  user: string;
  response_code: string;
  url: string;
  version: string;
  '@timestamp': number;
  should_ignore_this_field: string;
}

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

function getArtificialLogsWithDeviation(index: string, deviationType: string) {
  const bulkBody: estypes.BulkRequest<GeneratedDoc, GeneratedDoc>['body'] = [];
  const action = { index: { _index: index } };
  let tsOffset = 0;

  // Creates docs evenly spread across baseline and deviation time frame
  [BASELINE_TS, DEVIATION_TS].forEach((ts) => {
    ['Peter', 'Paul', 'Mary'].forEach((user) => {
      ['200', '404', '500'].forEach((responseCode) => {
        ['login.php', 'user.php', 'home.php'].forEach((url) => {
          // Don't add docs that match the exact pattern of the filter we want to base the test queries on
          if (
            !(
              user === 'Peter' &&
              responseCode === '500' &&
              (url === 'home.php' || url === 'login.php')
            )
          ) {
            tsOffset = 0;
            [...Array(100)].forEach(() => {
              tsOffset += Math.round(DAY_MS / 100);
              const doc: GeneratedDoc = {
                user,
                response_code: responseCode,
                url,
                version: 'v1.0.0',
                '@timestamp': ts + tsOffset,
                should_ignore_this_field: 'should_ignore_this_field',
              };

              bulkBody.push(action);
              bulkBody.push(doc);
            });
          }
        });
      });
    });
  });

  // Now let's add items to the dataset to make some specific significant terms being returned as results
  const docsPerUrl1: Record<string, number> = {
    'login.php': 299,
    'user.php': 300,
    'home.php': 301,
  };

  ['200', '404'].forEach((responseCode) => {
    ['login.php', 'user.php', 'home.php'].forEach((url) => {
      tsOffset = 0;
      [...Array(docsPerUrl1[url])].forEach(() => {
        tsOffset += Math.round(DAY_MS / docsPerUrl1[url]);
        bulkBody.push(action);
        bulkBody.push({
          user: 'Peter',
          response_code: responseCode,
          url,
          version: 'v1.0.0',
          '@timestamp':
            (deviationType === LOG_RATE_ANALYSIS_TYPE.SPIKE ? DEVIATION_TS : BASELINE_TS) +
            tsOffset,
          should_ignore_this_field: 'should_ignore_this_field',
        });
      });
    });
  });

  const docsPerUrl2: Record<string, number> = {
    'login.php': 399,
    'home.php': 400,
  };

  ['Paul', 'Mary'].forEach((user, userIndex) => {
    ['login.php', 'home.php'].forEach((url) => {
      tsOffset = 0;
      [...Array(docsPerUrl2[url] + userIndex)].forEach(() => {
        tsOffset += Math.round(DAY_MS / docsPerUrl2[url]);
        bulkBody.push(action);
        bulkBody.push({
          user,
          response_code: '500',
          url,
          version: 'v1.0.0',
          '@timestamp':
            (deviationType === LOG_RATE_ANALYSIS_TYPE.SPIKE ? DEVIATION_TS : BASELINE_TS) +
            tsOffset,
          should_ignore_this_field: 'should_ignore_this_field',
        });
      });
    });
  });

  return bulkBody;
}

export function LogRateAnalysisDataGeneratorProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  return new (class DataGenerator {
    public async generateData(dataGenerator: string) {
      switch (dataGenerator) {
        case 'kibana_sample_data_logs':
          // will be added via UI
          break;

        case 'farequote_with_spike':
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

          await es.updateByQuery({
            index: 'ft_farequote',
            body: {
              script: {
                // @ts-expect-error
                inline: 'ctx._source.custom_field = "default"',
                lang: 'painless',
              },
            },
          });

          await es.bulk({
            refresh: 'wait_for',
            body: [...Array(100)].flatMap((i) => {
              return [
                { index: { _index: 'ft_farequote' } },
                {
                  '@timestamp': '2016-02-09T16:19:59.000Z',
                  '@version': i,
                  airline: 'UAL',
                  custom_field: 'deviation',
                  responsetime: 10,
                  type: 'farequote',
                },
              ];
            }),
          });
          break;

        case 'artificial_logs_with_spike':
        case 'artificial_logs_with_dip':
          try {
            await es.indices.delete({
              index: dataGenerator,
            });
          } catch (e) {
            log.info(`Could not delete index '${dataGenerator}' in before() callback`);
          }

          // Create index with mapping
          await es.indices.create({
            index: dataGenerator,
            mappings: {
              properties: {
                user: { type: 'keyword' },
                response_code: { type: 'keyword' },
                url: { type: 'keyword' },
                version: { type: 'keyword' },
                '@timestamp': { type: 'date' },
                should_ignore_this_field: { type: 'keyword', doc_values: false, index: false },
              },
            },
          });

          await es.bulk({
            refresh: 'wait_for',
            body: getArtificialLogsWithDeviation(
              dataGenerator,
              dataGenerator.split('_').pop() ?? LOG_RATE_ANALYSIS_TYPE.SPIKE
            ),
          });
          break;

        default:
          log.error(`Unsupported data generator '${dataGenerator}`);
      }
    }

    public async removeGeneratedData(dataGenerator: string) {
      switch (dataGenerator) {
        case 'kibana_sample_data_logs':
          // do not remove
          break;

        case 'farequote_with_spike':
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
          break;

        case 'artificial_logs_with_spike':
        case 'artificial_logs_with_dip':
          try {
            await es.indices.delete({
              index: dataGenerator,
            });
          } catch (e) {
            log.error(`Error deleting index '${dataGenerator}' in after() callback`);
          }
          break;

        default:
          log.error(`Unsupported data generator '${dataGenerator}`);
      }
    }
  })();
}
