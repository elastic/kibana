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
import { expectToReject } from '../../utils';
import { cleanLogIndexTemplate, addIntegrationToLogIndexTemplate } from './es_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const es = getService('es');

  async function callApiAs(user: DatasetQualityApiClientKey) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/stats',
      params: {
        query: {
          type: 'logs',
        },
      },
    });
  }

  registry.when('Api Key privileges check', { config: 'basic' }, () => {
    describe('when missing required privileges', () => {
      it('fails with a 500 error', async () => {
        const err = await expectToReject<DatasetQualityApiError>(
          async () => await callApiAs('readUser')
        );

        expect(err.res.status).to.be(500);
        expect(err.res.body.message).to.contain('unauthorized');
      });
    });

    describe('when required privileges are set', () => {
      describe('and categorized datastreams', () => {
        const integration = 'my-custom-integration';

        before(async () => {
          await addIntegrationToLogIndexTemplate({ esClient: es, name: integration });

          await synthtrace.index([
            timerange('2023-11-20T15:00:00.000Z', '2023-11-20T15:01:00.000Z')
              .interval('1m')
              .rate(1)
              .generator((timestamp) =>
                log.create().message('This is a log message').timestamp(timestamp).defaults({
                  'log.file.path': '/my-service.log',
                })
              ),
          ]);
        });

        it('returns stats correctly', async () => {
          const stats = await callApiAs('datasetQualityLogsUser');

          expect(stats.body.dataStreamsStats.length).to.be(1);
          expect(stats.body.dataStreamsStats[0].integration).to.be(integration);
          expect(stats.body.dataStreamsStats[0].size).not.empty();
          expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
        });

        after(async () => {
          await synthtrace.clean();
          await cleanLogIndexTemplate({ esClient: es });
        });
      });

      describe('and uncategorized datastreams', () => {
        before(async () => {
          await synthtrace.index([
            timerange('2023-11-20T15:00:00.000Z', '2023-11-20T15:01:00.000Z')
              .interval('1m')
              .rate(1)
              .generator((timestamp) =>
                log.create().message('This is a log message').timestamp(timestamp).defaults({
                  'log.file.path': '/my-service.log',
                })
              ),
          ]);
        });

        it('returns stats correctly', async () => {
          const stats = await callApiAs('datasetQualityLogsUser');

          expect(stats.body.dataStreamsStats.length).to.be(1);
          expect(stats.body.dataStreamsStats[0].integration).not.ok();
          expect(stats.body.dataStreamsStats[0].size).not.empty();
          expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
        });

        after(async () => {
          await synthtrace.clean();
        });
      });
    });
  });
}
