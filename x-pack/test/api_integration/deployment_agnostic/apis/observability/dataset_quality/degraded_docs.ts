/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { DataStreamDocsStat } from '@kbn/dataset-quality-plugin/common/api_types';
import { SupertestWithRoleScopeType } from '../../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';

  async function callApiAs(roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/degraded_docs`)
      .query({
        types: rison.encodeArray(['logs']),
        start,
        end,
      });
  }

  describe('Degraded docs', function () {
    describe('Querying', function () {
      let synthtraceLogsEsClient: LogsSynthtraceEsClient;
      let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

      before(async () => {
        synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      describe('and there are log documents', () => {
        before(async () => {
          await synthtraceLogsEsClient.index([
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
          const stats = await callApiAs(supertestViewerWithCookieCredentials);
          expect(stats.body.degradedDocs.length).to.be(1);

          const degradedDocsStats = stats.body.degradedDocs.reduce(
            (acc: Record<string, { count: number }>, curr: DataStreamDocsStat) => ({
              ...acc,
              [curr.dataset]: {
                count: curr.count,
              },
            }),
            {}
          );

          expect(degradedDocsStats['logs-synth.2-default']).to.eql({
            count: 1,
          });
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });
      });

      describe('and there are not log documents', () => {
        it('returns stats correctly', async () => {
          const stats = await callApiAs(supertestViewerWithCookieCredentials);

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
              await synthtraceLogsEsClient.index([
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
              await synthtraceLogsEsClient.index([
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
          const stats = await callApiAs(supertestViewerWithCookieCredentials);
          expect(stats.body.degradedDocs.length).to.be(9);

          const expected = {
            degradedDocs: [
              {
                dataset: 'logs-apache.error-default',
                count: 1,
              },
              {
                dataset: 'logs-apache.error-space1',
                count: 1,
              },
              {
                dataset: 'logs-apache.error-space2',
                count: 1,
              },
              {
                dataset: 'logs-mysql.error-default',
                count: 1,
              },
              {
                dataset: 'logs-mysql.error-space1',
                count: 1,
              },
              {
                dataset: 'logs-mysql.error-space2',
                count: 1,
              },
              {
                dataset: 'logs-nginx.error-default',
                count: 1,
              },
              {
                dataset: 'logs-nginx.error-space1',
                count: 1,
              },
              {
                dataset: 'logs-nginx.error-space2',
                count: 1,
              },
            ],
          };

          expect(stats.body).to.eql(expected);
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });
      });
    });
  });
}

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
