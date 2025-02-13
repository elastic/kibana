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
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { uniq, map } from 'lodash';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

type ServicesDetailedStatisticsReturn =
  APIReturnType<'POST /internal/apm/services/detailed_statistics'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = '2021-01-01T00:00:00.000Z';
  const end = '2021-01-01T00:59:59.999Z';

  const serviceNames = ['my-service'];

  async function getStats(
    overrides?: Partial<
      APIClientRequestParamsOf<'POST /internal/apm/services/detailed_statistics'>['params']['query']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: `POST /internal/apm/services/detailed_statistics`,
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

  describe('Services detailed statistics', () => {
    describe('when data is not generated', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `POST /internal/apm/services/detailed_statistics`,
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
              _inspect: true,
            },
            body: {
              serviceNames: JSON.stringify(serviceNames),
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.currentPeriod).to.be.empty();
        expect(response.body.previousPeriod).to.be.empty();
      });
    });

    describe('when data is generated', () => {
      let servicesDetailedStatistics: ServicesDetailedStatisticsReturn;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      const instance = apm.service('my-service', 'production', 'java').instance('instance');

      const EXPECTED_TPM = 5;
      const EXPECTED_LATENCY = 1000;
      const EXPECTED_FAILURE_RATE = 0.25;

      function checkStats() {
        const stats = servicesDetailedStatistics.currentPeriod['my-service'];

        expect(stats).not.empty();

        expect(uniq(map(stats.throughput, 'y'))).eql([EXPECTED_TPM], 'tpm');

        expect(uniq(map(stats.latency, 'y'))).eql([EXPECTED_LATENCY * 1000], 'latency');

        expect(uniq(map(stats.transactionErrorRate, 'y'))).eql(
          [EXPECTED_FAILURE_RATE],
          'errorRate'
        );
      }

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const interval = timerange(new Date(start).getTime(), new Date(end).getTime() - 1).interval(
          '1m'
        );

        await apmSynthtraceEsClient.index([
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

      after(() => apmSynthtraceEsClient.clean());

      describe('and transaction metrics are used', () => {
        before(async () => {
          servicesDetailedStatistics = await getStats();
        });

        it('returns the expected statistics', () => {
          checkStats();
        });
      });

      describe('and service transaction metrics are used', () => {
        before(async () => {
          servicesDetailedStatistics = await getStats({
            documentType: ApmDocumentType.ServiceTransactionMetric,
          });
        });

        it('returns the expected statistics', () => {
          checkStats();
        });
      });

      describe('and rolled up data is used', () => {
        before(async () => {
          servicesDetailedStatistics = await getStats({
            rollupInterval: RollupInterval.TenMinutes,
            bucketSizeInSeconds: 600,
          });
        });

        it('returns the expected statistics', () => {
          checkStats();
        });
      });
    });
  });
}
