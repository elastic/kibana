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
                .logLevel(
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?'
                )
                .defaults({
                  'log.file.path': '/my-service.log',
                })
            ),
        ]);
      });

      it('returns stats correctly', async () => {
        const stats = await callApiAs('datasetQualityLogsUser');
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
        const stats = await callApiAs('datasetQualityLogsUser');

        expect(stats.body.degradedDocs.length).to.be(0);
      });
    });
  });
}
