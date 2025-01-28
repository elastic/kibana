/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { ValuesType } from 'utility-types';
import { DependencyOperation } from '@kbn/apm-plugin/server/routes/dependencies/get_top_dependency_operations';
import { meanBy } from 'lodash';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { roundNumber } from '../utils/common';
import { generateOperationData, generateOperationDataConfig } from './generate_operation_data';

type TopOperations = APIReturnType<'GET /internal/apm/dependencies/operations'>['operations'];

const {
  ES_BULK_DURATION,
  ES_BULK_RATE,
  ES_SEARCH_DURATION,
  ES_SEARCH_FAILURE_RATE,
  ES_SEARCH_SUCCESS_RATE,
  ES_SEARCH_UNKNOWN_RATE,
  REDIS_SET_DURATION,
  REDIS_SET_RATE,
} = generateOperationDataConfig;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi({
    dependencyName,
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    searchServiceDestinationMetrics = false,
  }: {
    dependencyName: string;
    environment?: string;
    kuery?: string;
    searchServiceDestinationMetrics?: boolean;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/dependencies/operations',
        params: {
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            environment,
            kuery,
            dependencyName,
            searchServiceDestinationMetrics,
          },
        },
      })
      .then(({ body }) => body.operations);
  }

  describe('Top operations', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const operations = await callApi({ dependencyName: 'elasticsearch' });
        expect(operations).to.empty();
      });
    });

    describe('when data is generated', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        return generateOperationData({
          apmSynthtraceEsClient,
          start,
          end,
        });
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('requested for elasticsearch', () => {
        let response: TopOperations;
        let searchOperation: ValuesType<TopOperations>;
        let bulkOperation: ValuesType<TopOperations>;

        before(async () => {
          response = await callApi({ dependencyName: 'elasticsearch' });
          searchOperation = response.find((op) => op.spanName === '/_search')!;
          bulkOperation = response.find((op) => op.spanName === '/_bulk')!;
        });

        it('returns the correct operations', () => {
          expect(response.length).to.eql(2);

          expect(searchOperation).to.be.ok();
          expect(bulkOperation).to.be.ok();
        });

        it('returns the correct latency', () => {
          expect(searchOperation.latency).to.eql(ES_SEARCH_DURATION * 1000);
          expect(bulkOperation.latency).to.eql(ES_BULK_DURATION * 1000);
        });

        it('returns the correct throughput', () => {
          const expectedSearchThroughput = roundNumber(
            ES_SEARCH_UNKNOWN_RATE + ES_SEARCH_SUCCESS_RATE + ES_SEARCH_FAILURE_RATE
          );
          const expectedBulkThroughput = ES_BULK_RATE;

          expect(roundNumber(searchOperation.throughput)).to.eql(expectedSearchThroughput);
          expect(roundNumber(bulkOperation.throughput)).to.eql(expectedBulkThroughput);

          expect(
            searchOperation.timeseries.throughput
              .map((bucket) => bucket.y)
              .every((val) => val === expectedSearchThroughput)
          );
        });

        it('returns the correct failure rate', () => {
          const expectedSearchFailureRate =
            ES_SEARCH_FAILURE_RATE / (ES_SEARCH_SUCCESS_RATE + ES_SEARCH_FAILURE_RATE);
          const expectedBulkFailureRate = null;

          expect(searchOperation.failureRate).to.be(expectedSearchFailureRate);

          expect(bulkOperation.failureRate).to.be(expectedBulkFailureRate);

          expect(
            searchOperation.timeseries.failureRate
              .map((bucket) => bucket.y)
              .every((val) => val === expectedSearchFailureRate)
          );

          expect(
            bulkOperation.timeseries.failureRate
              .map((bucket) => bucket.y)
              .every((val) => val === expectedBulkFailureRate)
          );
        });

        it('returns the correct impact', () => {
          expect(searchOperation.impact).to.eql(0);
          expect(bulkOperation.impact).to.eql(100);
        });
      });

      describe('requested for redis', () => {
        let response: TopOperations;
        let setOperation: ValuesType<TopOperations>;

        before(async () => {
          response = await callApi({ dependencyName: 'redis' });
          setOperation = response.find((op) => op.spanName === 'SET')!;
        });

        it('returns the correct operations', () => {
          expect(response.length).to.eql(1);

          expect(setOperation).to.be.ok();
        });

        it('returns the correct latency', () => {
          expect(setOperation.latency).to.eql(REDIS_SET_DURATION * 1000);
        });

        it('returns the correct throughput', () => {
          expect(roundNumber(setOperation.throughput)).to.eql(roundNumber(REDIS_SET_RATE));
        });
      });

      describe('requested for a specific service', () => {
        let response: TopOperations;
        let searchOperation: ValuesType<TopOperations>;
        let bulkOperation: ValuesType<TopOperations> | undefined;

        before(async () => {
          response = await callApi({
            dependencyName: 'elasticsearch',
            kuery: `service.name:"synth-go"`,
          });
          searchOperation = response.find((op) => op.spanName === '/_search')!;
          bulkOperation = response.find((op) => op.spanName === '/_bulk');
        });

        it('returns the correct operations', () => {
          expect(response.length).to.eql(1);

          expect(searchOperation).to.be.ok();
          expect(bulkOperation).not.to.be.ok();
        });
      });

      describe('requested for a specific environment', () => {
        let response: TopOperations;
        let searchOperation: ValuesType<TopOperations> | undefined;
        let bulkOperation: ValuesType<TopOperations>;

        before(async () => {
          response = await callApi({
            dependencyName: 'elasticsearch',
            environment: 'development',
          });
          searchOperation = response.find((op) => op.spanName === '/_search');
          bulkOperation = response.find((op) => op.spanName === '/_bulk')!;
        });

        it('returns the correct operations', () => {
          expect(response.length).to.eql(1);

          expect(searchOperation).not.to.be.ok();
          expect(bulkOperation).to.be.ok();
        });
      });

      describe('Compare span metrics and span events', () => {
        let bulkOperationSpanEventsResponse: ValuesType<TopOperations>;
        let bulkOperationSpanMetricsResponse: ValuesType<TopOperations>;

        before(async () => {
          const [spanEventsResponse, spanMetricsResponse] = await Promise.all([
            callApi({ dependencyName: 'elasticsearch', searchServiceDestinationMetrics: false }),
            callApi({ dependencyName: 'elasticsearch', searchServiceDestinationMetrics: true }),
          ]);
          function findBulkOperation(op: DependencyOperation) {
            return op.spanName === '/_bulk';
          }
          bulkOperationSpanEventsResponse = spanEventsResponse.find(findBulkOperation)!;
          bulkOperationSpanMetricsResponse = spanMetricsResponse.find(findBulkOperation)!;
        });

        it('returns same latency', () => {
          expect(bulkOperationSpanEventsResponse.latency).to.eql(
            bulkOperationSpanMetricsResponse.latency
          );

          const meanSpanMetrics = meanBy(
            bulkOperationSpanEventsResponse.timeseries.latency.filter(({ y }) => y !== null),
            'y'
          );
          const meanSpanEvents = meanBy(
            bulkOperationSpanMetricsResponse.timeseries.latency.filter(({ y }) => y !== null),
            'y'
          );
          expect(meanSpanMetrics).to.eql(meanSpanEvents);
        });

        it('returns same throughput', () => {
          expect(bulkOperationSpanEventsResponse.throughput).to.eql(
            bulkOperationSpanMetricsResponse.throughput
          );

          const meanSpanMetrics = meanBy(
            bulkOperationSpanEventsResponse.timeseries.throughput.filter(({ y }) => y !== 0),
            'y'
          );
          const meanSpanEvents = meanBy(
            bulkOperationSpanMetricsResponse.timeseries.throughput.filter(({ y }) => y !== 0),
            'y'
          );
          expect(meanSpanMetrics).to.eql(meanSpanEvents);
        });

        it('returns same impact', () => {
          expect(bulkOperationSpanEventsResponse.impact).to.eql(
            bulkOperationSpanMetricsResponse.impact
          );
        });
      });
    });
  });
}
