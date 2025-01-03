/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, syntheticsMonitor, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { cleanLogIndexTemplate, addIntegrationToLogIndexTemplate } from './es_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const logsSynthtrace = getService('logSynthtraceEsClient');
  const syntheticsSynthrace = getService('syntheticsSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const es = getService('es');

  async function callApiAs(
    user: DatasetQualityApiClientKey,
    types: Array<'logs' | 'metrics' | 'traces' | 'synthetics'> = ['logs']
  ) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/stats',
      params: {
        query: {
          types: rison.encodeArray(types),
        },
      },
    });
  }

  async function ingestDocuments({
    from = '2023-11-20T15:00:00.000Z',
    to = '2023-11-20T15:01:00.000Z',
    interval = '1m',
    rate = 1,
    dataset = 'synth.1',
  }: { from?: string; to?: string; interval?: string; rate?: number; dataset?: string } = {}) {
    await logsSynthtrace.index([
      timerange(from, to)
        .interval(interval)
        .rate(rate)
        .generator((timestamp) =>
          log
            .create()
            .message('This is a log message')
            .timestamp(timestamp)
            .dataset(dataset)
            .defaults({
              'log.file.path': '/my-service.log',
            })
        ),
    ]);
  }

  registry.when('Api Key privileges check', { config: 'basic' }, () => {
    describe('index privileges', () => {
      it('returns user authorization as false for noAccessUser', async () => {
        const resp = await callApiAs('noAccessUser');

        expect(resp.body.datasetUserPrivileges.canRead).to.be(false);
        expect(resp.body.datasetUserPrivileges.canMonitor).to.be(false);
        expect(resp.body.datasetUserPrivileges.canViewIntegrations).to.be(false);
        expect(resp.body.dataStreamsStats).to.eql([]);
      });

      it('returns correct user privileges for an elevated user', async () => {
        const resp = await callApiAs('adminUser');

        expect(resp.body.datasetUserPrivileges).to.eql({
          canRead: true,
          canMonitor: true,
          canViewIntegrations: true,
        });
      });

      it('get empty stats for a readUser', async () => {
        const resp = await callApiAs('readUser');

        expect(resp.body.datasetUserPrivileges.canRead).to.be(true);
        expect(resp.body.datasetUserPrivileges.canMonitor).to.be(false);
        expect(resp.body.datasetUserPrivileges.canViewIntegrations).to.be(false);
        expect(resp.body.dataStreamsStats).to.eql([]);
      });

      it('returns non empty stats for an authorized user', async () => {
        await ingestDocuments();
        const stats = await callApiAs('datasetQualityMonitorUser');

        expect(stats.body.dataStreamsStats[0].size).not.empty();
        expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
        expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
      });

      it('get list of privileged data streams for datasetQualityMonitorUser', async () => {
        // Index only one document to logs-test-1-default and logs-test-1-default data stream using synthtrace
        await ingestDocuments({ dataset: 'test.1' });
        await ingestDocuments({ dataset: 'test.2' });
        const resp = await callApiAs('datasetQualityMonitorUser');

        expect(resp.body.datasetUserPrivileges.canMonitor).to.be(true);
        expect(
          resp.body.dataStreamsStats
            .map(({ name, userPrivileges: { canMonitor: hasPrivilege } }) => ({
              name,
              hasPrivilege,
            }))
            .filter(({ name }) => name.includes('test'))
        ).to.eql([
          { name: 'logs-test.1-default', hasPrivilege: true },
          { name: 'logs-test.2-default', hasPrivilege: true },
        ]);
      });

      after(async () => {
        await logsSynthtrace.clean();
        await cleanLogIndexTemplate({ esClient: es });
      });
    });

    describe('when required privileges are set', () => {
      describe('and categorized datastreams', () => {
        const integration = 'my-custom-integration';

        before(async () => {
          await addIntegrationToLogIndexTemplate({ esClient: es, name: integration });

          await logsSynthtrace.index([
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
          const stats = await callApiAs('datasetQualityMonitorUser');

          expect(stats.body.dataStreamsStats.length).to.be(1);
          expect(stats.body.dataStreamsStats[0].integration).to.be(integration);
          expect(stats.body.dataStreamsStats[0].size).not.empty();
          expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].totalDocs).greaterThan(0);
        });

        after(async () => {
          await logsSynthtrace.clean();
          await cleanLogIndexTemplate({ esClient: es });
        });
      });

      describe('and uncategorized datastreams', () => {
        before(async () => {
          await logsSynthtrace.index([
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
          const stats = await callApiAs('datasetQualityMonitorUser');

          expect(stats.body.dataStreamsStats.length).to.be(1);
          expect(stats.body.dataStreamsStats[0].integration).not.ok();
          expect(stats.body.dataStreamsStats[0].size).not.empty();
          expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].totalDocs).greaterThan(0);
        });

        after(async () => {
          await logsSynthtrace.clean();
        });
      });

      describe('and multiple dataStream types are requested', () => {
        before(async () => {
          await logsSynthtrace.index([
            timerange('2023-11-20T15:00:00.000Z', '2023-11-20T15:01:00.000Z')
              .interval('1m')
              .rate(1)
              .generator((timestamp) => [
                log.create().message('This is a log message').timestamp(timestamp).defaults({
                  'log.file.path': '/my-service.log',
                }),
              ]),
          ]);
          await syntheticsSynthrace.index([
            timerange('2023-11-20T15:00:00.000Z', '2023-11-20T15:01:00.000Z')
              .interval('1m')
              .rate(1)
              .generator((timestamp) => [
                syntheticsMonitor.create().dataset('http').timestamp(timestamp),
              ]),
          ]);
        });

        it('returns stats correctly', async () => {
          const stats = await callApiAs('datasetQualityMonitorUser', ['logs', 'synthetics']);

          expect(stats.body.dataStreamsStats.length).to.be(2);
          expect(stats.body.dataStreamsStats[0].size).not.empty();
          expect(stats.body.dataStreamsStats[0].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].lastActivity).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].totalDocs).greaterThan(0);
          expect(stats.body.dataStreamsStats[0].name).match(new RegExp(/^logs-[\w.]+-[\w.]+/));
          expect(stats.body.dataStreamsStats[1].size).not.empty();
          expect(stats.body.dataStreamsStats[1].sizeBytes).greaterThan(0);
          expect(stats.body.dataStreamsStats[1].lastActivity).greaterThan(0);
          expect(stats.body.dataStreamsStats[1].totalDocs).greaterThan(0);
          expect(stats.body.dataStreamsStats[1].name).match(
            new RegExp(/^synthetics-[\w.]+-[\w.]+/)
          );
        });

        after(async () => {
          await logsSynthtrace.clean();
          await syntheticsSynthrace.clean();
        });
      });
    });
  });
}
