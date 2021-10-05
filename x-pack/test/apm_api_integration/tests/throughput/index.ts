/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { mean, sum } from 'lodash';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

type ThroughputReturn = APIReturnType<'GET /api/apm/services/{serviceName}/throughput'>;
type ServiceReturn = APIReturnType<'GET /api/apm/services'>;
type TransactionsDetailsReturn = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_data_generation_8.0.0';
  const metadata = archives_metadata[archiveName];

  let throughputResponse: ThroughputReturn;
  let serviceResponse: ServiceReturn;
  let transactionsDetailsReturn: TransactionsDetailsReturn;

  function callAPIs({ processorEvent }: { processorEvent: 'transaction' | 'metric' }) {
    return Promise.all([
      apmApiSupertest({
        endpoint: 'GET /api/apm/services',
        params: {
          query: {
            kuery: `service.name : "opbeans-go" and processor.event : "${processorEvent}"`,
            start: metadata.start,
            end: metadata.end,
            environment: 'ENVIRONMENT_ALL',
          },
        },
      }),
      apmApiSupertest({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
        params: {
          path: {
            serviceName: 'opbeans-go',
          },
          query: {
            kuery: `processor.event : "${processorEvent}"`,
            start: metadata.start,
            end: metadata.end,
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
          },
        },
      }),
      apmApiSupertest({
        endpoint: `GET /api/apm/services/{serviceName}/transactions/groups/main_statistics`,
        params: {
          path: {
            serviceName: 'opbeans-go',
          },
          query: {
            kuery: `processor.event : "${processorEvent}"`,
            start: metadata.start,
            end: metadata.end,
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            latencyAggregationType: 'avg' as LatencyAggregationType,
          },
        },
      }),
    ]);
  }

  registry.when(
    'Throughput value across apis',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('with kql filter to force transaction-based UI', () => {
        before(async () => {
          const [
            serviceApiResponse,
            serviceThroughputApiResponse,
            transactionsDetailsApiReturn,
          ] = await callAPIs({ processorEvent: 'transaction' });

          serviceResponse = serviceApiResponse.body;
          throughputResponse = serviceThroughputApiResponse.body;
          transactionsDetailsReturn = transactionsDetailsApiReturn.body;
        });

        it('matches throughput value betwen service, throughput chart and transactions apis ', () => {
          // return of calling GET /api/apm/services api
          const serviceApiThroughput = serviceResponse.items[0].throughput;

          // return of calling GET /api/apm/services/{serviceName}/throughput
          const throughputChartApiMean = mean(throughputResponse.currentPeriod.map((d) => d.y));

          const transactionsThroughputSum = sum(
            transactionsDetailsReturn.transactionGroups.map((data) => data.throughput)
          );
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(throughputChartApiMean));
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(transactionsThroughputSum));
        });
      });

      describe('with kql filter to force metric-based UI', () => {
        before(async () => {
          const [
            serviceApiResponse,
            serviceThroughputApiResponse,
            transactionsDetailsApiReturn,
          ] = await callAPIs({ processorEvent: 'metric' });

          serviceResponse = serviceApiResponse.body;
          throughputResponse = serviceThroughputApiResponse.body;
          transactionsDetailsReturn = transactionsDetailsApiReturn.body;
        });

        it('matches throughput value betwen service, throughput chart and transactions apis ', () => {
          // return of calling GET /api/apm/services api
          const serviceApiThroughput = serviceResponse.items[0].throughput;

          // return of calling GET /api/apm/services/{serviceName}/throughput
          const throughputChartApiMean = mean(throughputResponse.currentPeriod.map((d) => d.y));

          // return of calling GET /api/apm/services/{serviceName}/transactions/groups/main_statistics
          const transactionsThroughputSum = sum(
            transactionsDetailsReturn.transactionGroups.map((data) => data.throughput)
          );

          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(throughputChartApiMean));
          expect(roundNumber(serviceApiThroughput)).to.be(roundNumber(transactionsThroughputSum));
        });
      });
    }
  );
}
