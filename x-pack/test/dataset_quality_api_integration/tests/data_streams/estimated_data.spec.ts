/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const start = '2023-12-11T18:00:00.000Z';
  const oneDayEnd = '2023-12-12T18:00:00.000Z';
  const oneWeekEnd = '2023-12-18T18:00:00.000Z';
  const dataset = 'nginx.access';
  const namespace = 'default';

  async function callApiAs(type: 'logs' | 'metrics', end: string) {
    const user = 'datasetQualityLogsUser' as DatasetQualityApiClientKey;
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/estimated_data',
      params: {
        query: {
          type,
          start,
          end,
        },
      },
    });
  }

  registry.when('Estimated Data Details', { config: 'basic' }, () => {
    describe('gets the data streams estimated data', () => {
      before(async () => {
        await synthtrace.index([
          timerange(start, oneWeekEnd)
            .interval('1h')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(dataset)
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/my-service.log',
                })
            ),
        ]);
      });

      it('returns a non-empty body', async () => {
        const resp = await callApiAs('logs', oneDayEnd);
        expect(resp.body).not.empty();
      });

      it('returns correct estimated data for 1 day of logs', async () => {
        const resp = await callApiAs('logs', oneDayEnd);
        expect(resp.body.estimatedDataInBytes).to.be.lessThan(2500).greaterThan(1000);
      });

      it('returns correct estimated data for 1 week of logs', async () => {
        const resp = await callApiAs('logs', oneWeekEnd);
        expect(resp.body.estimatedDataInBytes).to.be.lessThan(20000).greaterThan(10000);
      });

      it('returns correct estimated data for no data index', async () => {
        const resp = await callApiAs('metrics', oneWeekEnd);
        expect(resp.body.estimatedDataInBytes).to.equal(0);
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}
