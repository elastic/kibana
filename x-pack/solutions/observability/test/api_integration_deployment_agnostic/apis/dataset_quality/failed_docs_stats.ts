/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { SupertestWithRoleScopeType } from '../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { processors } from './processors';

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
      .get(`/internal/dataset_quality/data_streams/${dataStreamName}/failed_docs`)
      .query({
        start,
        end: new Date().toISOString(),
      });
  }

  describe('Failed docs timeseries in dataStream', function () {
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
        });

        it('returns number of failed documents per DataStream', async () => {
          await retry.tryForTime(180 * 1000, async () => {
            const resp = await callApiAs(supertestViewerWithCookieCredentials);

            const lastTimeSerie = resp.body.timeSeries.pop();

            expect(resp.body.count).to.be(1);
            expect(resp.body.lastOccurrence).to.be.greaterThan(0);
            expect(lastTimeSerie?.y).to.be(1);
          });
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });
      });

      describe('and there are not failed documents', () => {
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
                  .logLevel('1')
                  .defaults({
                    'log.file.path': '/my-service.log',
                  })
              ),
          ]);
        });

        it('returns errors correctly', async () => {
          const resp = await callApiAs(supertestViewerWithCookieCredentials);

          expect(resp.body.count).to.be(0);
          expect(resp.body.lastOccurrence).to.be(undefined);
          expect(resp.body.timeSeries.length).to.be(0);
        });

        after(async () => {
          await synthtraceLogsEsClient.clean();
        });
      });
    });
  });
}
