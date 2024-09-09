/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityApiError } from '../../common/dataset_quality_api_supertest';
import { expectToReject } from '../../utils';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';

  async function callApiAs(user: DatasetQualityApiClientKey) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/degraded_docs',
      params: {
        query: {
          type: 'logs',
          start,
          end,
        },
      },
    });
  }

  registry.when('Degraded docs', { config: 'basic' }, () => {
    describe('authorization', () => {
      it('should return a 403 when the user does not have sufficient privileges', async () => {
        const err = await expectToReject<DatasetQualityApiError>(() => callApiAs('noAccessUser'));
        expect(err.res.status).to.be(403);
      });
    });

    describe('and there are log documents', () => {
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
                .dataset('synth.1')
                .defaults({
                  'log.file.path': '/my-service.log',
                })
            ),
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset('synth.2')
                .logLevel(MORE_THAN_1024_CHARS)
                .defaults({
                  'log.file.path': '/my-service.log',
                })
            ),
        ]);
      });

      it('returns stats correctly', async () => {
        const stats = await callApiAs('datasetQualityMonitorUser');
        expect(stats.body.degradedDocs.length).to.be(2);

        const degradedDocsStats = stats.body.degradedDocs.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.dataset]: {
              percentage: curr.percentage,
              count: curr.count,
            },
          }),
          {} as Record<string, { percentage: number; count: number }>
        );

        expect(degradedDocsStats['logs-synth.1-default']).to.eql({
          percentage: 0,
          count: 0,
        });
        expect(degradedDocsStats['logs-synth.2-default']).to.eql({
          percentage: 100,
          count: 1,
        });
      });

      after(async () => {
        await synthtrace.clean();
      });
    });

    describe('and there are not log documents', () => {
      it('returns stats correctly', async () => {
        const stats = await callApiAs('datasetQualityMonitorUser');

        expect(stats.body.degradedDocs.length).to.be(0);
      });
    });

    describe('when there are data streams of different spaces', () => {
      const spaces = ['default', 'space1', 'space2'];
      const datasetsWithNoDegradedDocs = ['nginx.access', 'apache.access', 'mysql.access'];
      const datasetsWithDegradedDocs = ['nginx.error', 'apache.error', 'mysql.error'];

      before(async () => {
        for (const space of spaces) {
          for (const dataset of datasetsWithNoDegradedDocs) {
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
                    .namespace(space)
                ),
            ]);
          }

          for (const dataset of datasetsWithDegradedDocs) {
            await synthtrace.index([
              timerange(start, end)
                .interval('1m')
                .rate(2)
                .generator((timestamp: number, index: number) =>
                  log
                    .create()
                    .message('This is a log message')
                    .timestamp(timestamp)
                    .dataset(dataset)
                    .namespace(space)
                    .logLevel(index % 2 === 0 ? MORE_THAN_1024_CHARS : 'This is a log message')
                ),
            ]);
          }
        }
      });

      it('returns counts and list of datasets correctly', async () => {
        const stats = await callApiAs('datasetQualityMonitorUser');
        expect(stats.body.degradedDocs.length).to.be(18);

        const expected = {
          degradedDocs: [
            {
              dataset: 'logs-apache.access-default',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-apache.access-space1',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-apache.access-space2',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-apache.error-default',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-apache.error-space1',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-apache.error-space2',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-mysql.access-default',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-mysql.access-space1',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-mysql.access-space2',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-mysql.error-default',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-mysql.error-space1',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-mysql.error-space2',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-nginx.access-default',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-nginx.access-space1',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-nginx.access-space2',
              count: 0,
              docsCount: 1,
              percentage: 0,
            },
            {
              dataset: 'logs-nginx.error-default',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-nginx.error-space1',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
            {
              dataset: 'logs-nginx.error-space2',
              count: 1,
              docsCount: 2,
              percentage: 50,
            },
          ],
        };

        expect(stats.body).to.eql(expected);
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
