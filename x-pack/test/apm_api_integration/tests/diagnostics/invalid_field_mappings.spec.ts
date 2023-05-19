/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { getDefaultIndexTemplateNames } from '@kbn/apm-plugin/common/diagnostics/get_default_index_template_names';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const supertest = getService('supertest');
  const es = getService('es');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  registry.when('Diagnostics: Invalid field mappings', { config: 'basic', archives: [] }, () => {
    describe('When there is no data', () => {
      it('returns response`', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics/invalid_field_mappings',
        });

        expect(status).to.be(200);
        expect(body.invalidFieldMappings).to.eql([]);
      });
    });

    describe('When data is ingested', () => {
      before(async () => {
        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await synthtraceEsClient.index(
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

      after(() => synthtraceEsClient.clean());

      it('returns empty response', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics/invalid_field_mappings',
        });

        expect(status).to.be(200);
        expect(body.invalidFieldMappings).to.eql([]);
      });
    });

    describe('When data is ingested without the necessary index templates', () => {
      before(async () => {
        // delete APM index templates and data streams
        await es.indices.deleteDataStream({ name: '*apm*' });
        await es.indices.deleteIndexTemplate({ name: getDefaultIndexTemplateNames() });
        await supertest.delete(`/api/fleet/epm/packages/apm`);

        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await synthtraceEsClient.index(
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
        await synthtraceEsClient.clean();
      });

      it('returns a list of items with mapping issues', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/diagnostics/invalid_field_mappings',
        });

        expect(status).to.be(200);
        expect(body.invalidFieldMappings).to.eql([
          {
            aggregatable: false,
            indices: ['traces-apm-default'],
            metadata_field: false,
            searchable: true,
            type: 'text',
          },
        ]);
      });
    });
  });
}
