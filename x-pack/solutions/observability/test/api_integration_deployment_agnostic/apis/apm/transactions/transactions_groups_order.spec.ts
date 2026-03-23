/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Readable } from 'stream';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

interface TransactionsGroupsMainStatistics {
  transactionGroups: Array<{ name: string; transactionType: string }>;
  maxCountExceeded: boolean;
  transactionOverflowCount: number;
  hasActiveAlerts: boolean;
}

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'service-go';
  const start = new Date('2021-10-10T00:00:00.000Z').getTime();
  const end = new Date('2021-10-10T00:15:00.000Z').getTime() - 1;

  // Expected transaction names in order
  const EXPECTED_TRANSACTION_NAMES = [
    'DELETE /cart',
    'DELETE /categories',
    'DELETE /customers',
    'DELETE /invoices',
    'DELETE /orders',
    'DELETE /payments',
    'DELETE /products',
    'DELETE /profile',
    'DELETE /reviews',
    'DELETE /users',
  ];

  async function fetchTransactionGroups() {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          latencyAggregationType: LatencyAggregationType.avg,
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          useDurationSummary: false,
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
        },
      },
    });
    expect(response.status).to.be(200);
    return response.body as TransactionsGroupsMainStatistics;
  }

  describe('Transaction groups order', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      const instance = apm
        .service({ name: serviceName, environment: 'production', agentName: 'go' })
        .instance('instance-a');

      const events = timerange(start, end)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return EXPECTED_TRANSACTION_NAMES.map((transactionName) => {
            return instance
              .transaction({ transactionName, transactionType: 'request' })
              .timestamp(timestamp)
              .duration(1000)
              .success();
          });
        });

      const unserialized = Array.from(events);
      await apmSynthtraceEsClient.index(Readable.from(unserialized));
    });

    after(() => apmSynthtraceEsClient.clean());

    it('returns transaction names in the correct order', async () => {
      const response = await fetchTransactionGroups();
      const transactionNames = response.transactionGroups.map((group) => group.name);

      // Verify we have at least the expected number of transactions
      expect(transactionNames.length >= EXPECTED_TRANSACTION_NAMES.length).to.be(true);

      // Verify the order of the first 10 transactions matches expected order
      const firstTenTransactions = transactionNames.slice(0, EXPECTED_TRANSACTION_NAMES.length);
      expect(firstTenTransactions).to.eql(EXPECTED_TRANSACTION_NAMES);

      // Verify each transaction has the correct position (index) in the array
      EXPECTED_TRANSACTION_NAMES.forEach((expectedName, index) => {
        const actualIndex = transactionNames.indexOf(expectedName);
        expect(actualIndex).to.be(index);
      });
    });

    it('includes the correct transactionNames in the detailed statistics request', async () => {
      const mainStatistics = await fetchTransactionGroups();
      const transactionNames = mainStatistics.transactionGroups
        .slice(0, EXPECTED_TRANSACTION_NAMES.length)
        .map((group) => group.name);

      // Verify we have the expected transaction names
      expect(transactionNames).to.eql(EXPECTED_TRANSACTION_NAMES);

      // Now fetch detailed statistics with these transaction names
      const detailedStatisticsResponse = await apmApiClient.readUser({
        endpoint:
          'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
        params: {
          path: { serviceName },
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
            latencyAggregationType: LatencyAggregationType.avg,
            transactionType: 'request',
            transactionNames: JSON.stringify(transactionNames),
            bucketSizeInSeconds: 60,
            useDurationSummary: false,
            documentType: ApmDocumentType.TransactionMetric,
            rollupInterval: RollupInterval.OneMinute,
          },
        },
      });

      expect(detailedStatisticsResponse.status).to.be(200);

      // Verify detailed statistics contains data for all expected transaction names
      const detailedStats = detailedStatisticsResponse.body;
      if (detailedStats.currentPeriod) {
        const statsTransactionNames = Object.keys(detailedStats.currentPeriod);

        expect(statsTransactionNames).to.eql(EXPECTED_TRANSACTION_NAMES);
      }
    });
  });
}
