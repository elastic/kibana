/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { mean, sum } from 'lodash';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_data_generation_8.0.0';
  const metadata = archives_metadata[archiveName];

  async function getThroughputValues({
    processorEvent,
    serviceName,
  }: {
    processorEvent: 'transaction' | 'metric';
    serviceName: string;
  }) {
    const commonQuery = {
      start: metadata.start,
      end: metadata.end,
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      serviceApiResponse,
      serviceThroughputApiResponse,
      transactionsDetailsApiReturn,
    ] = await Promise.all([
      apmApiSupertest({
        endpoint: 'GET /api/apm/services',
        params: {
          query: {
            ...commonQuery,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
          },
        },
      }),
      apmApiSupertest({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
          },
        },
      }),
      apmApiSupertest({
        endpoint: `GET /api/apm/services/{serviceName}/transactions/groups/main_statistics`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            latencyAggregationType: 'avg' as LatencyAggregationType,
          },
        },
      }),
    ]);
    const serviceApiThroughput = serviceApiResponse.body.items[0].throughput;

    const throughputChartApiMean = mean(
      serviceThroughputApiResponse.body.currentPeriod.map((d) => d.y)
    );

    const transactionsThroughputSum = sum(
      transactionsDetailsApiReturn.body.transactionGroups.map((data) => data.throughput)
    );

    return {
      serviceApiThroughput,
      throughputChartApiMean,
      transactionsThroughputSum,
    };
  }

  let throughputValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when(
    'Throughput value across apis',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('with kql filter to force transaction-based UI', () => {
        before(async () => {
          throughputValues = await getThroughputValues({
            serviceName: 'opbeans-go',
            processorEvent: 'transaction',
          });
        });

        it('matches throughput value betwen service, throughput chart and transactions apis ', () => {
          const {
            serviceApiThroughput,
            throughputChartApiMean,
            transactionsThroughputSum,
          } = throughputValues;
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(throughputChartApiMean));
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(transactionsThroughputSum));
        });
      });

      describe('with kql filter to force metric-based UI', () => {
        before(async () => {
          throughputValues = await getThroughputValues({
            serviceName: 'opbeans-go',
            processorEvent: 'metric',
          });
        });

        it('matches throughput value betwen service, throughput chart and transactions apis ', () => {
          const {
            serviceApiThroughput,
            throughputChartApiMean,
            transactionsThroughputSum,
          } = throughputValues;
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(throughputChartApiMean));
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(transactionsThroughputSum));
        });
      });
    }
  );
}
