/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { apm, timerange } from '@elastic/apm-synthtrace';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { ENVIRONMENT_ALL } from '../../../../plugins/apm/common/environment_filter_values';
import { SupertestReturnType } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');

  const archiveName = 'apm_8.0.0';

  const archiveRange = archives_metadata[archiveName];

  // url parameters
  const archiveStart = archiveRange.start;
  const archiveEnd = archiveRange.end;

  const start = '2021-10-01T00:00:00.000Z';
  const end = '2021-10-01T00:05:00.000Z';

  registry.when(
    'APM Services Overview with a basic license when data is not generated',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
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
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.items.length).to.be(0);
      });
    }
  );

  registry.when(
    'APM Services Overview with a basic license when data is generated',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /internal/apm/services'>;
      };

      const range = timerange(new Date(start).getTime(), new Date(end).getTime());
      const transactionInterval = range.interval('1s');
      const metricInterval = range.interval('30s');

      const errorInterval = range.interval('5s');

      const multipleEnvServiceProdInstance = apm
        .service('multiple-env-service', 'production', 'go')
        .instance('multiple-env-service-production');

      const multipleEnvServiceDevInstance = apm
        .service('multiple-env-service', 'development', 'go')
        .instance('multiple-env-service-development');

      const metricOnlyInstance = apm
        .service('metric-only-service', 'production', 'java')
        .instance('metric-only-production');

      const errorOnlyInstance = apm
        .service('error-only-service', 'production', 'java')
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

      before(async () => {
        return synthtrace.index([
          transactionInterval
            .rate(config.multiple.prod.rps)
            .spans((timestamp) => [
              ...multipleEnvServiceProdInstance
                .transaction('GET /api')
                .timestamp(timestamp)
                .duration(config.multiple.prod.duration)
                .success()
                .serialize(),
            ]),
          transactionInterval
            .rate(config.multiple.dev.rps)
            .spans((timestamp) => [
              ...multipleEnvServiceDevInstance
                .transaction('GET /api')
                .timestamp(timestamp)
                .duration(config.multiple.dev.duration)
                .failure()
                .serialize(),
            ]),
          transactionInterval
            .rate(config.multiple.prod.rps)
            .spans((timestamp) => [
              ...multipleEnvServiceDevInstance
                .transaction('non-request', 'rpc')
                .timestamp(timestamp)
                .duration(config.multiple.prod.duration)
                .success()
                .serialize(),
            ]),
          metricInterval.rate(1).spans((timestamp) => [
            ...metricOnlyInstance
              .appMetrics({
                'system.memory.actual.free': 1,
                'system.cpu.total.norm.pct': 1,
                'system.memory.total': 1,
                'system.process.cpu.total.norm.pct': 1,
              })
              .timestamp(timestamp)
              .serialize(),
          ]),
          errorInterval
            .rate(1)
            .spans((timestamp) => [
              ...errorOnlyInstance.error('Foo').timestamp(timestamp).serialize(),
            ]),
        ]);
      });

      after(() => {
        return synthtrace.clean();
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
              },
            },
          });
        });

        it('returns a successful response', () => {
          expect(response.status).to.be(200);
        });

        it('returns the correct statistics', () => {
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
    }
  );

  registry.when(
    'APM Services Overview with a trial license when data is loaded',
    { config: 'trial', archives: [archiveName] },
    () => {
      describe('with the default APM read user', () => {
        describe('and fetching a list of services', () => {
          let response: {
            status: number;
            body: APIReturnType<'GET /internal/apm/services'>;
          };

          before(async () => {
            response = await apmApiClient.readUser({
              endpoint: `GET /internal/apm/services`,
              params: {
                query: {
                  start: archiveStart,
                  end: archiveEnd,
                  environment: ENVIRONMENT_ALL.value,
                  kuery: '',
                  probability: 1,
                },
              },
            });
          });

          it('the response is successful', () => {
            expect(response.status).to.eql(200);
          });

          it('there is at least one service', () => {
            expect(response.body.items.length).to.be.greaterThan(0);
          });

          it('some items have a health status set', () => {
            // Under the assumption that the loaded archive has
            // at least one APM ML job, and the time range is longer
            // than 15m, at least one items should have a health status
            // set. Note that we currently have a bug where healthy
            // services report as unknown (so without any health status):
            // https://github.com/elastic/kibana/issues/77083

            const healthStatuses = sortBy(response.body.items, 'serviceName').map(
              (item: any) => item.healthStatus
            );

            expect(healthStatuses.filter(Boolean).length).to.be.greaterThan(0);

            expectSnapshot(healthStatuses).toMatchInline(`
              Array [
                undefined,
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
              ]
            `);
          });
        });
      });

      describe('with a user that does not have access to ML', () => {
        let response: SupertestReturnType<'GET /internal/apm/services'>;
        before(async () => {
          response = await apmApiClient.noMlAccessUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start: archiveStart,
                end: archiveEnd,
                environment: ENVIRONMENT_ALL.value,
                kuery: '',
                probability: 1,
              },
            },
          });
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('there is at least one service', () => {
          expect(response.body.items.length).to.be.greaterThan(0);
        });

        it('contains no health statuses', () => {
          const definedHealthStatuses = response.body.items
            .map((item) => item.healthStatus)
            .filter(Boolean);

          expect(definedHealthStatuses.length).to.be(0);
        });
      });

      describe('and fetching a list of services with a filter', () => {
        let response: SupertestReturnType<'GET /internal/apm/services'>;
        before(async () => {
          response = await apmApiClient.noMlAccessUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start: archiveStart,
                end: archiveEnd,
                environment: ENVIRONMENT_ALL.value,
                kuery: 'service.name:opbeans-java',
                probability: 1,
              },
            },
          });
        });

        it('does not return health statuses for services that are not found in APM data', () => {
          expect(response.status).to.be(200);

          expect(response.body.items.length).to.be(1);

          expect(response.body.items[0].serviceName).to.be('opbeans-java');
        });
      });
    }
  );
}
