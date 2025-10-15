/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { DatasetQualityApiClientKey } from '../../common/config';
import type { FtrProviderContext } from '../../common/ftr_provider_context';

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

  async function callApiAs(
    user: DatasetQualityApiClientKey,
    dataStream: string,
    body: {
      failureStoreEnabled: boolean;
      customRetentionPeriod: string | undefined;
    }
  ) {
    return await datasetQualityApiClient[user]({
      endpoint: 'PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store',
      params: {
        path: {
          dataStream,
        },
        body,
      },
    });
  }

  registry.when('Update Failure Store', { config: 'basic' }, () => {
    describe('updates failure store configuration for data streams', function () {
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

      after(async () => {
        await synthtrace.clean();
      });

      it('should enable failure store successfully', async () => {
        const dataStreamName = `${type}-${dataset}-${namespace}`;
        const resp = await callApiAs('adminUser', dataStreamName, {
          failureStoreEnabled: true,
          customRetentionPeriod: undefined,
        });
        expect(resp.status).to.be(200);
      });

      it('should disable failure store successfully', async () => {
        const dataStreamName = `${type}-${dataset}-${namespace}`;
        const resp = await callApiAs('adminUser', dataStreamName, {
          failureStoreEnabled: false,
          customRetentionPeriod: undefined,
        });
        expect(resp.status).to.be(200);
      });

      it('should enable failure store with custom retention period', async () => {
        const dataStreamName = `${type}-${dataset}-${namespace}`;
        const resp = await callApiAs('adminUser', dataStreamName, {
          failureStoreEnabled: true,
          customRetentionPeriod: '30d',
        });
        expect(resp.status).to.be(200);
      });
    });
  });
}
