/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, apmOtel, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-plugin/common/environment_filter_values';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const start = new Date('2024-01-01T00:00:00.000Z').getTime();
const end = new Date('2024-01-01T00:15:00.000Z').getTime() - 1;
const startIso = new Date(start).toISOString();
const endIso = new Date(end).toISOString();

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const es = getService('es');

  async function getIngestionType(serviceName: string, environment = ENVIRONMENT_ALL_VALUE) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/ingestion_type',
      params: {
        path: { serviceName },
        query: { start: startIso, end: endIso, environment },
      },
    });
  }

  describe('ingestion_type', () => {
    describe('when there is no data', () => {
      it('returns unknown for a service with no indexed documents', async () => {
        const { status, body } = await getIngestionType('unknown-service');
        expect(status).to.be(200);
        expect(body.schema).to.be('unknown');
      });
    });

    describe('when APM-processed data exists', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      const serviceName = 'synth-apm-ingestion-type';

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const instance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(100)
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns ecs', async () => {
        const { status, body } = await getIngestionType(serviceName);
        expect(status).to.be(200);
        expect(body.schema).to.be('ecs');
      });
    });

    describe('when unprocessed OTel data exists', () => {
      const serviceName = 'synth-otel-unprocessed-ingestion-type';
      let spanId: string;

      before(async () => {
        const instance = apmOtel
          .service({
            name: serviceName,
            namespace: 'production',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
          })
          .instance('instance-otel-unprocessed');

        const events = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            instance.span({ name: 'GET /api', kind: 'Server' }).timestamp(timestamp).duration(100)
          );

        const serialized = Array.from(events).flatMap((event) => event.serialize());
        spanId = serialized[0].span_id!;

        await es.index({
          index: 'traces-generic.otel-default',
          document: {
            ...serialized[0],
            'service.name': serviceName,
          },
          refresh: 'wait_for',
        });
      });

      after(async () => {
        await es.deleteByQuery({
          index: 'traces-generic.otel-default*',
          query: { term: { span_id: spanId } },
          refresh: true,
          conflicts: 'proceed',
        });
      });

      it('returns otel', async () => {
        const { status, body } = await getIngestionType(serviceName);
        expect(status).to.be(200);
        expect(body.schema).to.be('otel');
      });
    });
  });
}
