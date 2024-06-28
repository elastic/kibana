/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const es = getService('es');
  const synthtraceKibanaClient = getService('synthtraceKibanaClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  // FLAKY: https://github.com/elastic/kibana/pull/177039
  registry.when.skip('Diagnostics: Indices', { config: 'basic', archives: [] }, () => {
    describe.skip('When there is no data', () => {
      it('returns empty response`', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });

        expect(status).to.be(200);
        expect(body.validIndices).to.eql([]);
        expect(body.invalidIndices).to.eql([]);
      });
    });

    describe.skip('When data is ingested', () => {
      before(async () => {
        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(30)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns empty response', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });

        expect(status).to.be(200);
        expect(body.validIndices?.length).to.be.greaterThan(0);
        expect(body.invalidIndices).to.eql([]);
      });
    });

    describe.skip('When data is ingested without the necessary index templates', () => {
      before(async () => {
        await es.indices.deleteDataStream({ name: 'traces-apm-*' });
        await es.indices.deleteIndexTemplate({ name: ['traces-apm'] });

        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(30)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(async () => {
        await es.indices.delete({ index: 'traces-apm-default' });
        const latestVersion = await synthtraceKibanaClient.fetchLatestApmPackageVersion();
        await synthtraceKibanaClient.installApmPackage(latestVersion);
        await apmSynthtraceEsClient.clean();
      });

      it('returns a list of items with mapping issues', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });

        expect(status).to.be(200);
        expect(body.validIndices?.length).to.be.greaterThan(0);
        expect(body.invalidIndices).to.eql([
          {
            isValid: false,
            fieldMappings: { isValid: false, invalidType: 'text' },
            ingestPipeline: { isValid: false },
            index: 'traces-apm-default',
          },
        ]);
      });
    });

    describe.skip('ingest pipelines', () => {
      before(async () => {
        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(30)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(async () => {
        const latestVersion = await synthtraceKibanaClient.fetchLatestApmPackageVersion();
        await synthtraceKibanaClient.installApmPackage(latestVersion);
        await apmSynthtraceEsClient.clean();
      });

      describe.skip('an ingest pipeline is removed', () => {
        before(async () => {
          const datastreamToUpdate = await es.indices.getDataStream({
            name: 'metrics-apm.internal-default',
          });
          await es.indices.putSettings({
            index: datastreamToUpdate.data_streams[0].indices[0].index_name,
            // @ts-expect-error: Allow null values in https://github.com/elastic/elasticsearch-specification/pull/2126
            body: { index: { default_pipeline: null } },
          });
        });

        it('returns the item without an ingest pipeline', async () => {
          const { status, body } = await apmApiClient.adminUser({
            endpoint: 'GET /internal/apm/diagnostics',
          });

          expect(status).to.be(200);
          expect(body.validIndices?.length).to.be.greaterThan(0);
          expect(body.invalidIndices?.length).to.be(1);

          expect(omit(body.invalidIndices?.[0], 'index')).to.eql({
            isValid: false,
            fieldMappings: { isValid: true },
            ingestPipeline: { isValid: false },
            dataStream: 'metrics-apm.internal-default',
          });
        });
      });

      describe.skip('an ingest pipeline is changed', () => {
        before(async () => {
          const datastreamToUpdate = await es.indices.getDataStream({
            name: 'metrics-apm.internal-default',
          });
          await es.indices.putSettings({
            index: datastreamToUpdate.data_streams[0].indices[0].index_name,
            body: { index: { default_pipeline: 'logs-default-pipeline' } },
          });
        });

        it('returns the item without an ingest pipeline', async () => {
          const { status, body } = await apmApiClient.adminUser({
            endpoint: 'GET /internal/apm/diagnostics',
          });

          expect(status).to.be(200);
          expect(body.validIndices?.length).to.be.greaterThan(0);
          expect(body.invalidIndices?.length).to.be(1);
          expect(omit(body.invalidIndices?.[0], 'index')).to.eql({
            isValid: false,
            fieldMappings: { isValid: true },
            ingestPipeline: { isValid: false, id: 'logs-default-pipeline' },
            dataStream: 'metrics-apm.internal-default',
          });
        });
      });
    });
  });
}
