/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import { LogsCustom } from '@kbn/apm-synthtrace/src/lib/logs/logs_synthtrace_es_client';
import { APIClientRequestParamsOf } from '@kbn/dataset-quality-plugin/common';
import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const logsSynthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const retry = getService('retry');

  const from = '2025-01-27T11:00:00.000Z';
  const to = '2025-01-27T11:01:00.000Z';
  const dataStreamType = 'logs';
  const dataset = 'synth';
  const syntheticsDataset = 'synthetics';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const syntheticsDataStreamName = `${dataStreamType}-${syntheticsDataset}-${namespace}`;

  const endpoint = 'GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs';
  type ApiParams = APIClientRequestParamsOf<typeof endpoint>['params']['query'];

  const processors = [
    {
      script: {
        tag: 'normalize log level',
        lang: 'painless',
        source: `
          String level = ctx['log.level'];
          if ('0'.equals(level)) {
            ctx['log.level'] = 'info';
          } else if ('1'.equals(level)) {
            ctx['log.level'] = 'debug';
          } else if ('2'.equals(level)) {
            ctx['log.level'] = 'warning';
          } else if ('3'.equals(level)) {
            ctx['log.level'] = 'error';
          } else {
            throw new Exception("Not a valid log level");
          }
        `,
      },
    },
  ];

  async function callApiAs({
    user,
    dataStream,
    apiParams: { start, end },
  }: {
    user: DatasetQualityApiClientKey;
    dataStream: string;
    apiParams: ApiParams;
  }) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs',
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

  registry.when('Failed docs in dataStream', { config: 'basic' }, () => {
    describe('index privileges', () => {
      before(async () => {
        await logsSynthtrace.createCustomPipeline(processors);
        await logsSynthtrace.createComponentTemplate({
          name: LogsCustom,
          dataStreamOptions: {
            failure_store: {
              enabled: true,
            },
          },
        });

        await logsSynthtrace.index([
          timerange(from, to)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => [
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(syntheticsDataset)
                .namespace(namespace)
                .logLevel('5')
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName,
                  'host.name': hostName,
                }),
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(dataset)
                .namespace(namespace)
                .logLevel('0')
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName,
                  'host.name': hostName,
                }),
            ]),
        ]);
      });

      after(async () => {
        await logsSynthtrace.clean();
      });

      it('returns number of failed documents per DataStream', async () => {
        await retry.tryForTime(180 * 1000, async () => {
          const resp = await callApiAs({
            user: 'readUser',
            dataStream: syntheticsDataStreamName,
            apiParams: {
              start: from,
              end: new Date().toISOString(),
            },
          });

          const lastTimeSerie = resp.body.timeSeries.pop();

          expect(resp.body.count).to.be(1);
          expect(resp.body.lastOccurrence).to.be.greaterThan(0);
          expect(lastTimeSerie?.y).to.be(1);
        });
      });

      it('returns empty when all documents are outside timeRange', async () => {
        const resp = await callApiAs({
          user: 'readUser',
          dataStream: 'someOtherDataStream',
          apiParams: {
            start: from,
            end: new Date().toISOString(),
          },
        });

        expect(resp.body.count).to.be(0);
        expect(resp.body.lastOccurrence).to.be(0);
        expect(resp.body.timeSeries.length).to.be(0);
      });
    });
  });
}
