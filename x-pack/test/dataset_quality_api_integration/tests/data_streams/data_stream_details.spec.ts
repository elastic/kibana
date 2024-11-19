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
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApiAs(user: DatasetQualityApiClientKey, dataStream: string) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/details',
      params: {
        path: {
          dataStream,
        },
        query: {
          start,
          end,
        },
      },
    });
  }

  registry.when('DataStream Details', { config: 'basic' }, () => {
    describe('gets the data stream details', () => {
      before(async () => {
        await synthtrace.index([
          timerange(start, end)
            .interval('1m')
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
                  'service.name': serviceName,
                  'host.name': hostName,
                })
            ),
        ]);
      });

      it('returns "sizeBytes" correctly', async () => {
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          `${type}-${dataset}-${namespace}`
        );
        expect(isNaN(resp.body.sizeBytes as number)).to.be(false);
        expect(resp.body.sizeBytes).to.be.greaterThan(0);
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}
