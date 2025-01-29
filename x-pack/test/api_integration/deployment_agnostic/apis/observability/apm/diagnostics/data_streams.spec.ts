/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const es = getService('es');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  describe('Diagnostics: Data streams', () => {
    describe('When there is no data', () => {
      before(async () => {
        // delete APM data streams
        await es.indices.deleteDataStream({ name: '*apm*' });
      });

      it('returns zero data streams`', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        expect(body.dataStreams).to.eql([]);
      });

      it('returns zero non-data stream indices`', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        expect(body.nonDataStreamIndices).to.eql([]);
      });
    });

    describe('When data is ingested', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

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

      it('returns 5 data streams', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        expect(body.dataStreams).to.eql([
          { name: 'metrics-apm.internal-default', template: 'metrics-apm.internal@template' },
          {
            name: 'metrics-apm.service_summary.1m-default',
            template: 'metrics-apm.service_summary.1m@template',
          },
          {
            name: 'metrics-apm.service_transaction.1m-default',
            template: 'metrics-apm.service_transaction.1m@template',
          },
          {
            name: 'metrics-apm.transaction.1m-default',
            template: 'metrics-apm.transaction.1m@template',
          },
          { name: 'traces-apm-default', template: 'traces-apm@template' },
        ]);
      });

      it('returns zero non-data stream indices', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        expect(body.nonDataStreamIndices).to.eql([]);
      });
    });
  });
}
