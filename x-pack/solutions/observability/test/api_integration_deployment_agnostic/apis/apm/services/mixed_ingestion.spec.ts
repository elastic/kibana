/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, apmOtel, timerange, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-plugin/common/environment_filter_values';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-mixed-ingestion';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T01:00:00.000Z').getTime() - 1;
  const midpoint = new Date('2021-01-01T00:30:00.000Z').getTime();

  describe('Service mixed ingestion', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
        expect(response.body.ingestionTimeRanges).to.be(undefined);
      });
    });

    describe('when only classic APM data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        const classicInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-classic');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              classicInstance
                .transaction({ transactionName: 'GET /api/products' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns hasMultipleAgentTypes as false', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
        expect(response.body.ingestionTimeRanges).to.be(undefined);
      });
    });

    describe('when both classic APM and OTel data are loaded', () => {
      let classicClient: ApmSynthtraceEsClient;
      let otelClient: ApmSynthtraceEsClient;

      before(async () => {
        classicClient = await synthtrace.createApmSynthtraceEsClient();

        const classicInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-classic');

        await classicClient.index([
          timerange(start, midpoint)
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              classicInstance
                .transaction({ transactionName: 'GET /api/products' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);

        otelClient = await synthtrace.createApmSynthtraceEsClient();
        otelClient.setPipeline(otelClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));

        const otelInstance = apmOtel
          .service({
            name: serviceName,
            namespace: 'production',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
          })
          .instance('instance-otel');

        await otelClient.index([
          timerange(midpoint, end)
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              otelInstance
                .span({ name: 'GET /api/products', kind: 'Server' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(async () => {
        await classicClient.clean();
        await otelClient.clean();
      });

      it('returns hasMultipleAgentTypes as true with time ranges', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(true);
        expect(response.body.ingestionTimeRanges).to.be.an('object');
        expect(response.body.ingestionTimeRanges?.classicApm).to.be.an('object');
        expect(response.body.ingestionTimeRanges?.otelNative).to.be.an('object');
        expect(response.body.ingestionTimeRanges?.classicApm.from).to.be.a('number');
        expect(response.body.ingestionTimeRanges?.classicApm.to).to.be.a('number');
        expect(response.body.ingestionTimeRanges?.otelNative.from).to.be.a('number');
        expect(response.body.ingestionTimeRanges?.otelNative.to).to.be.a('number');
      });

      it('returns false when querying only the classic APM time range', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(midpoint - 60000).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
      });

      it('returns true when filtering by the environment that has both types', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'production',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(true);
      });

      it('returns false when filtering by an environment with no data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'staging',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
      });

      it('returns true with a kuery that matches both ingestion types', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: `service.name: "${serviceName}"`,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(true);
      });

      it('returns false with a kuery that matches no data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: 'service.name: "nonexistent-service"',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
      });
    });

    describe('when mixed data exists across multiple environments', () => {
      let classicProdClient: ApmSynthtraceEsClient;
      let otelStagingClient: ApmSynthtraceEsClient;

      before(async () => {
        classicProdClient = await synthtrace.createApmSynthtraceEsClient();

        const classicProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'java' })
          .instance('instance-classic-prod');

        await classicProdClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              classicProdInstance
                .transaction({ transactionName: 'GET /api/products' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);

        otelStagingClient = await synthtrace.createApmSynthtraceEsClient();
        otelStagingClient.setPipeline(
          otelStagingClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel)
        );

        const otelStagingInstance = apmOtel
          .service({
            name: serviceName,
            namespace: 'staging',
            sdkName: 'opentelemetry',
            sdkLanguage: 'java',
          })
          .instance('instance-otel-staging');

        await otelStagingClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              otelStagingInstance
                .span({ name: 'GET /api/products', kind: 'Server' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(async () => {
        await classicProdClient.clean();
        await otelStagingClient.clean();
      });

      it('returns true for ENVIRONMENT_ALL (both types present across envs)', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: ENVIRONMENT_ALL_VALUE,
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(true);
      });

      it('returns false for production (only classic APM)', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
          params: {
            path: { serviceName },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              environment: 'production',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.hasMultipleAgentTypes).to.be(false);
      });
    });
  });
}
