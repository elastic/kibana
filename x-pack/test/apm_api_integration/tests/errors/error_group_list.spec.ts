/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@elastic/apm-synthtrace';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type ErrorGroups =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>['errorGroups'];

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when('when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.errorGroups).to.empty();
    });
  });

  registry.when(
    'when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('errors group', () => {
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
          const serviceInstance = apm
            .service(serviceName, 'production', 'go')
            .instance('instance-a');

          await synthtraceEsClient.index([
            timerange(start, end)
              .interval('1m')
              .rate(appleTransaction.successRate)
              .generator((timestamp) =>
                serviceInstance
                  .transaction(appleTransaction.name)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(appleTransaction.failureRate)
              .generator((timestamp) =>
                serviceInstance
                  .transaction(appleTransaction.name)
                  .errors(serviceInstance.error('error 1', 'foo').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(bananaTransaction.successRate)
              .generator((timestamp) =>
                serviceInstance
                  .transaction(bananaTransaction.name)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(bananaTransaction.failureRate)
              .generator((timestamp) =>
                serviceInstance
                  .transaction(bananaTransaction.name)
                  .errors(serviceInstance.error('error 2', 'bar').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('returns the correct data', () => {
          let errorGroups: ErrorGroups;
          before(async () => {
            const response = await callApi();
            errorGroups = response.body.errorGroups;
          });

          it('returns correct number of errors', () => {
            expect(errorGroups.length).to.equal(2);
            expect(errorGroups.map((error) => error.name).sort()).to.eql(['error 1', 'error 2']);
          });

          it('returns correct occurences', () => {
            const numberOfBuckets = 15;
            expect(errorGroups.map((error) => error.occurrences).sort()).to.eql([
              appleTransaction.failureRate * numberOfBuckets,
              bananaTransaction.failureRate * numberOfBuckets,
            ]);
          });
        });
      });
    }
  );
}
