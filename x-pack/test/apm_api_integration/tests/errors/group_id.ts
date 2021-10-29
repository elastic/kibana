/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { RecursivePartial } from '../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ErrorsDistribution =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/{groupId}'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}',
      params: {
        path: {
          serviceName,
          groupId: 'foo',
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  registry.when('when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.occurrencesCount).to.be(0);
    });
  });

  registry.when(
    'when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('error group id', () => {
        const appleTransaction = {
          name: 'GET /apple 🍎 ',
          successRate: 75,
          failureRate: 25,
        };
        const bananaTransaction = {
          name: 'GET /banana 🍌',
          successRate: 50,
          failureRate: 50,
        };

        before(async () => {
          const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
            'instance-a'
          );

          const interval = '1m';

          const indices = [appleTransaction, bananaTransaction]
            .map((transaction, index) => {
              return [
                ...timerange(start, end)
                  .interval(interval)
                  .rate(transaction.successRate)
                  .flatMap((timestamp) =>
                    serviceGoProdInstance
                      .transaction(transaction.name)
                      .timestamp(timestamp)
                      .duration(1000)
                      .success()
                      .serialize()
                  ),
                ...timerange(start, end)
                  .interval(interval)
                  .rate(transaction.failureRate)
                  .flatMap((timestamp) =>
                    serviceGoProdInstance
                      .transaction(transaction.name)
                      .errors(
                        serviceGoProdInstance
                          .error(`Error ${index}`, transaction.name)
                          .timestamp(timestamp)
                      )
                      .duration(1000)
                      .timestamp(timestamp)
                      .failure()
                      .serialize()
                  ),
              ];
            })
            .flatMap((_) => _);

          await synthtraceEsClient.index(indices);
        });

        after(() => synthtraceEsClient.clean());

        describe('return correct data', () => {
          let errorsDistribution: ErrorsDistribution;
          before(async () => {
            const response = await callApi({
              path: { groupId: '0000000000000000000000000Error 1' },
            });
            errorsDistribution = response.body;
          });

          it('displays correct number of occurrences', () => {
            const numberOfBuckets = 15;
            expect(errorsDistribution.occurrencesCount).to.equal(
              bananaTransaction.failureRate * numberOfBuckets
            );
          });
        });
      });
    }
  );
}
