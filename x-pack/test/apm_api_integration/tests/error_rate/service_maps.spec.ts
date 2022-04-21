/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getErrorRateValues(processorEvent: 'transaction' | 'metric') {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [serviceInventoryAPIResponse, serviceMapsNodeDetails] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services',
        params: {
          query: {
            ...commonQuery,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
        params: {
          path: { serviceName },
          query: commonQuery,
        },
      }),
    ]);

    const serviceInventoryErrorRate =
      serviceInventoryAPIResponse.body.items[0].transactionErrorRate;

    const serviceMapsNodeDetailsErrorRate = meanBy(
      serviceMapsNodeDetails.body.currentPeriod.failedTransactionsRate?.timeseries,
      'y'
    );

    return {
      serviceInventoryErrorRate,
      serviceMapsNodeDetailsErrorRate,
    };
  }

  let errorRateMetricValues: Awaited<ReturnType<typeof getErrorRateValues>>;
  let errorTransactionValues: Awaited<ReturnType<typeof getErrorRateValues>>;
  registry.when(
    'Service maps APIs',
    { config: 'trial', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded ', () => {
        const GO_PROD_LIST_RATE = 75;
        const GO_PROD_LIST_ERROR_RATE = 25;
        const GO_PROD_ID_RATE = 50;
        const GO_PROD_ID_ERROR_RATE = 50;
        before(async () => {
          const serviceGoProdInstance = apm
            .service(serviceName, 'production', 'go')
            .instance('instance-a');

          const transactionNameProductList = 'GET /api/product/list';
          const transactionNameProductId = 'GET /api/product/:id';

          await synthtraceEsClient.index([
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_LIST_RATE)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList, 'Worker')
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_LIST_ERROR_RATE)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList, 'Worker')
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_ID_RATE)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_ID_ERROR_RATE)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('compare latency value between service inventory and service maps', () => {
          before(async () => {
            [errorTransactionValues, errorRateMetricValues] = await Promise.all([
              getErrorRateValues('transaction'),
              getErrorRateValues('metric'),
            ]);
          });

          it('returns same avg error rate value for Transaction-based and Metric-based data', () => {
            [
              errorTransactionValues.serviceInventoryErrorRate,
              errorTransactionValues.serviceMapsNodeDetailsErrorRate,
              errorRateMetricValues.serviceInventoryErrorRate,
              errorRateMetricValues.serviceMapsNodeDetailsErrorRate,
            ].forEach((value) => expect(value).to.be.equal(GO_PROD_ID_ERROR_RATE / 100));
          });
        });
      });
    }
  );
}
