/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { log, timerange } from '@kbn/synthtrace-client';
import type { DataStreamDocsStat } from '@kbn/dataset-quality-plugin/common/api_types';
import type { SupertestWithRoleScopeType } from '../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { processors } from './processors';
import { closeDataStream, rolloverDataStream } from './utils';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const esClient = getService('es');
  const retry = getService('retry');

  const start = '2025-05-19T18:00:00.000Z';
  const end = '2025-05-19T18:01:00.000Z';

  const type = 'logs';
  const dataset = 'synth.2';
  const namespace = 'default';
  const dataStreamName = `${type}-${dataset}-${namespace}`;
  const customComponentTemplateName = 'logs-synth@mappings';
  const customPipelineName = 'synth.2@pipeline';

  async function callApiAs(roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/failed_docs`)
      .query({
        types: rison.encodeArray(['logs']),
        start,
        end: new Date().toISOString(),
      });
  }

  describe('Failed docs', function () {
    describe('Querying', function () {
      let synthtraceLogsEsClient: LogsSynthtraceEsClient;
      let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

      before(async () => {
        synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
        await synthtraceLogsEsClient.createCustomPipeline(processors, 'synth.2@pipeline');
        await synthtraceLogsEsClient.createComponentTemplate({
          name: customComponentTemplateName,
          dataStreamOptions: {
            failure_store: {
              enabled: true,
            },
          },
        });
        await esClient.indices.putIndexTemplate({
          name: dataStreamName,
          _meta: {
            managed: false,
            description: 'custom synth template created by synthtrace tool.',
          },
          template: {
            settings: {
              default_pipeline: customPipelineName,
            },
          },
          priority: 500,
          index_patterns: [dataStreamName],
          composed_of: [
            customComponentTemplateName,
            'logs@mappings',
            'logs@settings',
            'ecs@mappings',
          ],
          allow_auto_create: true,
          data_stream: {
            hidden: false,
          },
        });

        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'admin',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      after(async () => {
        await esClient.indices.deleteIndexTemplate({ name: dataStreamName });
        await synthtraceLogsEsClient.deleteComponentTemplate(customComponentTemplateName);
        await synthtraceLogsEsClient.deleteCustomPipeline(customPipelineName);
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
                  .logLevel('5')
                  .defaults({
                    'log.file.path': '/my-service.log',
                  })
              ),
          ]);

          await synthtraceLogsEsClient.refresh();
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });

        it('returns stats correctly', async () => {
          await retry.tryForTime(180 * 1000, async () => {
            const stats = await callApiAs(supertestViewerWithCookieCredentials);
            expect(stats.body.failedDocs.length).to.be(1);

            const failedDocsStats = stats.body.failedDocs.reduce(
              (acc: Record<string, { count: number }>, curr: DataStreamDocsStat) => ({
                ...acc,
                [curr.dataset]: {
                  count: curr.count,
                },
              }),
              {}
            );

            expect(failedDocsStats['logs-synth.2-default']).to.eql({
              count: 1,
            });
          });
        });
      });

      describe('and there are not log documents', () => {
        it('returns stats correctly', async () => {
          const stats = await callApiAs(supertestViewerWithCookieCredentials);

          expect(stats.body.failedDocs.length).to.be(0);
        });
      });

      describe('when there are data streams closed', () => {
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
                  .logLevel('5')
                  .defaults({
                    'log.file.path': '/my-service.log',
                  })
              ),
          ]);

          await closeDataStream(esClient, 'logs-synth.2-default::failures');
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });

        it('returns stats correctly', async () => {
          const stats = await callApiAs(supertestViewerWithCookieCredentials);

          expect(stats.body.failedDocs.length).to.be(0);
        });

        describe('when new backing indices are open', () => {
          before(async () => {
            await rolloverDataStream(esClient, 'logs-synth.2-default::failures');

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
                    .logLevel('5')
                    .defaults({
                      'log.file.path': '/my-service.log',
                    })
                ),
            ]);
          });

          after(async () => {
            await synthtraceLogsEsClient.clean();
          });

          it('returns stats correctly when some of the backing indices are closed and others are open', async () => {
            await retry.tryForTime(180 * 1000, async () => {
              const stats = await callApiAs(supertestViewerWithCookieCredentials);
              expect(stats.body.failedDocs.length).to.be(1);

              const failedDocsStats = stats.body.failedDocs.reduce(
                (acc: Record<string, { count: number }>, curr: DataStreamDocsStat) => ({
                  ...acc,
                  [curr.dataset]: {
                    count: curr.count,
                  },
                }),
                {}
              );

              expect(failedDocsStats['logs-synth.2-default']).to.eql({
                count: 1,
              });
            });
          });
        });
      });
    });
  });
}
