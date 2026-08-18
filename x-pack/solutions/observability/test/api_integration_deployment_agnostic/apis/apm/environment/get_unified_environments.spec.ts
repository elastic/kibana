/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, apmOtel, timerange, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const start = new Date('2024-01-01T00:00:00.000Z').getTime();
const end = new Date('2024-01-01T00:15:00.000Z').getTime() - 1;
const startIso = new Date(start).toISOString();
const endIso = new Date(end).toISOString();

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  async function getUnifiedEnvironments(serviceName: string) {
    return apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/unified_environments',
      params: {
        path: { serviceName },
        query: { start: startIso, end: endIso },
      },
    });
  }

  describe('Unified environments', () => {
    describe('when there is no data', () => {
      it('returns an empty list', async () => {
        const { status, body } = await getUnifiedEnvironments('unknown-service');
        expect(status).to.be(200);
        expect(body.environments).to.eql([]);
      });
    });

    describe('when APM-processed data exists', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const instance = apm
          .service({ name: 'apm-service', environment: 'production', agentName: 'java' })
          .instance('instance-a');

        const instanceStaging = apm
          .service({ name: 'apm-service', environment: 'staging', agentName: 'java' })
          .instance('instance-b');

        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => [
              instance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(100),
              instanceStaging
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(100),
            ])
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns environments from APM transactions', async () => {
        const { status, body } = await getUnifiedEnvironments('apm-service');
        expect(status).to.be(200);
        expect(body.environments).to.eql(['production', 'staging']);
      });

      it('does not return environments for a different service', async () => {
        const { status, body } = await getUnifiedEnvironments('other-service');
        expect(status).to.be(200);
        expect(body.environments).to.eql([]);
      });
    });

    describe('when unprocessed OTel data exists', () => {
      let otelSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        otelSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        otelSynthtraceEsClient.setPipeline(
          otelSynthtraceEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel)
        );

        const instance = apmOtel
          .service({
            name: 'otel-service',
            namespace: 'production',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
          })
          .instance('instance-otel');

        await otelSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance.span({ name: 'GET /api', kind: 'Server' }).timestamp(timestamp).duration(100)
            )
        );
      });

      after(() => otelSynthtraceEsClient.clean());

      it('returns environments from OTel spans', async () => {
        const { status, body } = await getUnifiedEnvironments('otel-service');
        expect(status).to.be(200);
        expect(body.environments.length).to.be.greaterThan(0);
      });
    });
  });
}
