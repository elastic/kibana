/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = '2021-10-01T00:00:00.000Z';
  const end = '2021-10-01T01:00:00.000Z';

  describe('Top services', () => {
    describe('APM Services Overview with a basic license when data is not generated', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services`,
          params: {
            query: {
              start,
              end,
              environment: ENVIRONMENT_ALL.value,
              kuery: '',
              probability: 1,
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              useDurationSummary: true,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(0);
        expect(response.body.maxCountExceeded).to.be(false);
        expect(response.body.serviceOverflowCount).to.be(0);
      });
    });

    describe('APM Services Overview with a basic license when data is generated', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let response: {
        status: number;
        body: APIReturnType<'GET /internal/apm/services'>;
      };

      const range = timerange(new Date(start).getTime(), new Date(end).getTime());
      const transactionInterval = range.interval('1s');
      const metricInterval = range.interval('30s');

      const errorInterval = range.interval('5s');

      const multipleEnvServiceProdInstance = apm
        .service({ name: 'multiple-env-service', environment: 'production', agentName: 'go' })
        .instance('multiple-env-service-production');

      const multipleEnvServiceDevInstance = apm
        .service({ name: 'multiple-env-service', environment: 'development', agentName: 'go' })
        .instance('multiple-env-service-development');

      const metricOnlyInstance = apm
        .service({ name: 'metric-only-service', environment: 'production', agentName: 'java' })
        .instance('metric-only-production');

      const errorOnlyInstance = apm
        .service({ name: 'error-only-service', environment: 'production', agentName: 'java' })
        .instance('error-only-production');

      const config = {
        multiple: {
          prod: {
            rps: 4,
            duration: 1000,
          },
          dev: {
            rps: 1,
            duration: 500,
          },
        },
      };

      function checkStats() {
        const multipleEnvService = response.body.items.find(
          (item) => item.serviceName === 'multiple-env-service'
        );

        const totalRps = config.multiple.prod.rps + config.multiple.dev.rps;

        expect(multipleEnvService).to.eql({
          serviceName: 'multiple-env-service',
          transactionType: 'request',
          environments: ['production', 'development'],
          agentName: 'go',
          latency:
            1000 *
            ((config.multiple.prod.duration * config.multiple.prod.rps +
              config.multiple.dev.duration * config.multiple.dev.rps) /
              totalRps),
          throughput: totalRps * 60,
          transactionErrorRate:
            config.multiple.dev.rps / (config.multiple.prod.rps + config.multiple.dev.rps),
        });
      }

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        return apmSynthtraceEsClient.index([
          transactionInterval
            .rate(config.multiple.prod.rps)
            .generator((timestamp) =>
              multipleEnvServiceProdInstance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(config.multiple.prod.duration)
                .success()
            ),
          transactionInterval
            .rate(config.multiple.dev.rps)
            .generator((timestamp) =>
              multipleEnvServiceDevInstance
                .transaction({ transactionName: 'GET /api' })
                .timestamp(timestamp)
                .duration(config.multiple.dev.duration)
                .failure()
            ),
          transactionInterval
            .rate(config.multiple.prod.rps)
            .generator((timestamp) =>
              multipleEnvServiceDevInstance
                .transaction({ transactionName: 'non-request', transactionType: 'rpc' })
                .timestamp(timestamp)
                .duration(config.multiple.prod.duration)
                .success()
            ),
          metricInterval.rate(1).generator((timestamp) =>
            metricOnlyInstance
              .appMetrics({
                'system.memory.actual.free': 1,
                'system.cpu.total.norm.pct': 1,
                'system.memory.total': 1,
                'system.process.cpu.total.norm.pct': 1,
              })
              .timestamp(timestamp)
          ),
          errorInterval
            .rate(1)
            .generator((timestamp) =>
              errorOnlyInstance.error({ message: 'Foo' }).timestamp(timestamp)
            ),
        ]);
      });

      after(() => {
        return apmSynthtraceEsClient.clean();
      });

      describe('when no additional filters are applied', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
                kuery: '',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns a successful response', () => {
          expect(response.status).to.be(200);
        });

        it('returns the correct statistics', () => {
          checkStats();
        });

        it('returns services without transaction data', () => {
          const serviceNames = response.body.items.map((item) => item.serviceName);

          expect(serviceNames).to.contain('metric-only-service');

          expect(serviceNames).to.contain('error-only-service');
        });
      });

      describe('when applying an environment filter', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: 'production',
                kuery: '',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns data only for that environment', () => {
          const multipleEnvService = response.body.items.find(
            (item) => item.serviceName === 'multiple-env-service'
          );

          const totalRps = config.multiple.prod.rps;

          expect(multipleEnvService).to.eql({
            serviceName: 'multiple-env-service',
            transactionType: 'request',
            environments: ['production'],
            agentName: 'go',
            latency: 1000 * ((config.multiple.prod.duration * config.multiple.prod.rps) / totalRps),
            throughput: totalRps * 60,
            transactionErrorRate: 0,
          });
        });
      });

      describe('when applying a kuery filter', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
                kuery: 'service.node.name:"multiple-env-service-development"',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns data for that kuery filter only', () => {
          const multipleEnvService = response.body.items.find(
            (item) => item.serviceName === 'multiple-env-service'
          );

          const totalRps = config.multiple.dev.rps;

          expect(multipleEnvService).to.eql({
            serviceName: 'multiple-env-service',
            transactionType: 'request',
            environments: ['development'],
            agentName: 'go',
            latency: 1000 * ((config.multiple.dev.duration * config.multiple.dev.rps) / totalRps),
            throughput: totalRps * 60,
            transactionErrorRate: 1,
          });
        });
      });

      describe('when excluding default transaction types', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
                kuery: 'not (transaction.type:request)',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns data for the top transaction type that is not a default', () => {
          const multipleEnvService = response.body.items.find(
            (item) => item.serviceName === 'multiple-env-service'
          );

          expect(multipleEnvService?.transactionType).to.eql('rpc');
        });
      });

      describe('when using service transaction metrics', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
                kuery: '',
                probability: 1,
                documentType: ApmDocumentType.ServiceTransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns services without transaction data', () => {
          const serviceNames = response.body.items.map((item) => item.serviceName);

          expect(serviceNames).to.contain('metric-only-service');

          expect(serviceNames).to.contain('error-only-service');
        });

        it('returns the correct statistics', () => {
          checkStats();
        });
      });

      describe('when using rolled up data', () => {
        before(async () => {
          response = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start,
                end,
                environment: ENVIRONMENT_ALL.value,
                kuery: '',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.TenMinutes,
                useDurationSummary: true,
              },
            },
          });
        });

        it('returns the correct statistics', () => {
          checkStats();
        });
      });
    });
  });
}
