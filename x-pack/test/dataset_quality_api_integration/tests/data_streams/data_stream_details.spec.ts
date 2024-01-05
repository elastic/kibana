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
import { expectToReject, getDataStreamSettingsOfFirstIndex } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const esClient = getService('es');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const dataStream = 'nginx.access';
  const namespace = 'default';

  async function callApiAs(user: DatasetQualityApiClientKey, datasetQuery: string) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/details',
      params: {
        query: {
          datasetQuery,
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
                .dataset(dataStream)
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/my-service.log',
                })
            ),
        ]);
      });

      it('returns error when dataset query arg is not provided', async () => {
        expect(
          (await expectToReject(() => callApiAs('datasetQualityLogsUser', ''))).message
        ).to.contain('Dataset query cannot be empty');
      });

      it('returns 404 if matching data stream is not available', async () => {
        const nonExistentDataStream = 'Non-existent';
        const expectedMessage = `logs-${nonExistentDataStream}-${namespace} not found`;
        const err = await expectToReject(() =>
          callApiAs('datasetQualityLogsUser', `${nonExistentDataStream}-${namespace}`)
        );
        expect(err.res.status).to.be(404);
        expect(err.res.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
      });

      it('returns data stream details correctly', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfFirstIndex(
          esClient,
          `logs-${dataStream}-${namespace}`
        );
        const resp = await callApiAs('datasetQualityLogsUser', `${dataStream}-${namespace}`);
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}
