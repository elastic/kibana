/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { DatasetQualityApiError } from '../../common/dataset_quality_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  expectToReject,
  getDataStreamSettingsOfEarliestIndex,
  rolloverDataStream,
} from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const esClient = getService('es');
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
      endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/settings',
      params: {
        path: {
          dataStream,
        },
      },
    });
  }

  registry.when('DataStream Settings', { config: 'basic' }, () => {
    describe('gets the data stream settings', () => {
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

      it('returns error when dataStream param is not provided', async () => {
        const expectedMessage = 'Data Stream name cannot be empty';
        const err = await expectToReject<DatasetQualityApiError>(() =>
          callApiAs('datasetQualityLogsUser', encodeURIComponent(' '))
        );
        expect(err.res.status).to.be(400);
        expect(err.res.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
      });

      it('returns {} if matching data stream is not available', async () => {
        const nonExistentDataSet = 'Non-existent';
        const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
        const resp = await callApiAs('datasetQualityLogsUser', nonExistentDataStream);
        expect(resp.body).empty();
      });

      it('returns "createdOn" correctly', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          `${type}-${dataset}-${namespace}`
        );
        const resp = await callApiAs('datasetQualityLogsUser', `${type}-${dataset}-${namespace}`);
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
      });

      it('returns "createdOn" correctly for rolled over dataStream', async () => {
        await rolloverDataStream(esClient, `${type}-${dataset}-${namespace}`);
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          `${type}-${dataset}-${namespace}`
        );
        const resp = await callApiAs('datasetQualityLogsUser', `${type}-${dataset}-${namespace}`);
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}
