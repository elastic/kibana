/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { RecursivePartial } from '../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ErrorGroupsMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/error_groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/error_groups/main_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/error_groups/main_statistics`,
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Error groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body.error_groups).to.empty();
        expect(response.body.is_aggregation_accurate).to.eql(true);
      });
    }
  );

  registry.when(
    'Error groups main statistics',
    { config: 'basic', archives: ['apm_8.0.0_empty'] },
    () => {
      describe('when data is loaded', () => {
        const GO_PROD_LIST_RATE = 75;
        const GO_PROD_LIST_ERROR_RATE = 25;
        const GO_PROD_ID_RATE = 50;
        const GO_PROD_ID_ERROR_RATE = 50;
        const ERROR_NAME_1 = 'Error test 1';
        const ERROR_NAME_2 = 'Error test 2';
        before(async () => {
          const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
            'instance-a'
          );

          const transactionNameProductList = 'GET /api/product/list';
          const transactionNameProductId = 'GET /api/product/:id';

          await synthtraceEsClient.index([
            ...timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_LIST_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_LIST_ERROR_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList)
                  .errors(serviceGoProdInstance.error(ERROR_NAME_1, 'foo').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_ID_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_ID_ERROR_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .errors(serviceGoProdInstance.error(ERROR_NAME_2, 'bar').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
                  .serialize()
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('returns the correct data', () => {
          let errorGroupMainStatistics: ErrorGroupsMainStatistics;
          before(async () => {
            const response = await callApi();
            errorGroupMainStatistics = response.body;
          });

          it('returns correct number of errors', () => {
            expect(errorGroupMainStatistics.error_groups.length).to.equal(2);
            expect(errorGroupMainStatistics.error_groups.map((error) => error.name).sort()).to.eql([
              ERROR_NAME_1,
              ERROR_NAME_2,
            ]);
          });

          it('returns correct occurences', () => {
            const numberOfBuckets = 15;
            expect(
              errorGroupMainStatistics.error_groups.map((error) => error.occurrences).sort()
            ).to.eql([
              GO_PROD_LIST_ERROR_RATE * numberOfBuckets,
              GO_PROD_ID_ERROR_RATE * numberOfBuckets,
            ]);
          });

          it('has same last seen value as end date', () => {
            errorGroupMainStatistics.error_groups.map((error) => {
              expect(error.lastSeen).to.equal(moment(end).startOf('minute').valueOf());
            });
          });
        });
      });
    }
  );
}
