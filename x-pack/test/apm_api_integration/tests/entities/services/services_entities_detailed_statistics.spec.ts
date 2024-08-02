/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { apm, log, timerange } from '@kbn/apm-synthtrace-client';
import { uniq, map } from 'lodash';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

type ServicesEntitiesDetailedStatisticsReturn =
  APIReturnType<'POST /internal/apm/entities/services/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('apmSynthtraceEsClient');
  const logSynthtrace = getService('logSynthtraceEsClient');

  const start = '2024-01-01T00:00:00.000Z';
  const end = '2024-01-01T00:59:59.999Z';

  const serviceNames = ['my-service', 'synth-go'];
  const hostName = 'synth-host';
  const serviceName = 'synth-go';

  const EXPECTED_TPM = 5;
  const EXPECTED_LATENCY = 1000;
  const EXPECTED_FAILURE_RATE = 0.25;
  const EXPECTED_LOG_RATE = 0.016666666666666666;
  const EXPECTED_LOG_ERROR_RATE = 1;

  async function getStats(
    overrides?: Partial<
      APIClientRequestParamsOf<'POST /internal/apm/entities/services/detailed_statistics'>['params']['query']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: `POST /internal/apm/entities/services/detailed_statistics`,
      params: {
        query: {
          start,
          end,
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          probability: 1,
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          bucketSizeInSeconds: 60,
          ...overrides,
        },
        body: {
          serviceNames: JSON.stringify(serviceNames),
        },
      },
    });

    return response.body;
  }

  registry.when(
    'Services entities detailed statistics when data is generated',
    { config: 'basic', archives: [] },
    () => {
      let servicesEntitiesDetailedStatistics: ServicesEntitiesDetailedStatisticsReturn;

      const instance = apm.service('my-service', 'production', 'java').instance('instance');

      before(async () => {
        const interval = timerange(new Date(start).getTime(), new Date(end).getTime() - 1).interval(
          '1m'
        );

        await logSynthtrace.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .logLevel('error')
                .timestamp(timestamp)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName,
                  'host.name': hostName,
                  'service.environment': 'test',
                })
            ),
          timerange(start, end)
            .interval('2m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is an error log message')
                .logLevel('error')
                .timestamp(timestamp)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': 'my-service',
                  'host.name': hostName,
                  'service.environment': 'production',
                })
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is an info message')
                .logLevel('info')
                .timestamp(timestamp)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': 'my-service',
                  'host.name': hostName,
                  'service.environment': 'production',
                })
            ),
        ]);

        await synthtrace.index([
          interval.rate(3).generator((timestamp) => {
            return instance
              .transaction('GET /api')
              .duration(EXPECTED_LATENCY)
              .outcome('success')
              .timestamp(timestamp);
          }),
          interval.rate(1).generator((timestamp) => {
            return instance
              .transaction('GET /api')
              .duration(EXPECTED_LATENCY)
              .outcome('failure')
              .timestamp(timestamp);
          }),
          interval.rate(1).generator((timestamp) => {
            return instance
              .transaction('GET /api')
              .duration(EXPECTED_LATENCY)
              .outcome('unknown')
              .timestamp(timestamp);
          }),
        ]);
      });

      after(() => synthtrace.clean());

      describe('and transaction metrics are used', () => {
        before(async () => {
          servicesEntitiesDetailedStatistics = await getStats();
        });

        it('returns the expected statistics for apm', () => {
          const stats = servicesEntitiesDetailedStatistics.currentPeriod.apm['my-service'];

          expect(stats).not.empty();
          expect(uniq(map(stats.throughput, 'y'))).eql([EXPECTED_TPM], 'tpm');

          expect(uniq(map(stats.latency, 'y'))).eql([EXPECTED_LATENCY * 1000], 'latency');

          expect(uniq(map(stats.transactionErrorRate, 'y'))).eql(
            [EXPECTED_FAILURE_RATE],
            'errorRate'
          );
        });

        it('returns the expected statistics for logs', () => {
          const statsLogErrorRate =
            servicesEntitiesDetailedStatistics.currentPeriod.logErrorRate[serviceName];
          const statsLogRate =
            servicesEntitiesDetailedStatistics.currentPeriod.logRate[serviceName];

          expect(statsLogErrorRate.every(({ y }) => y === EXPECTED_LOG_ERROR_RATE)).to.be(true);
          expect(statsLogRate.every(({ y }) => y === EXPECTED_LOG_RATE)).to.be(true);
        });
      });
    }
  );
}
