/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

type ErrorGroups =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics'>['errorGroups'];

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const serviceName = 'synth-swift';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics',
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

  // FLAKY: https://github.com/elastic/kibana/issues/177651
  registry.when.skip('when data is loaded', { config: 'basic', archives: [] }, () => {
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
          .service({ name: serviceName, environment: 'production', agentName: 'swift' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(appleTransaction.successRate)
            .generator((timestamp) =>
              serviceInstance
                .transaction({ transactionName: appleTransaction.name })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(appleTransaction.failureRate)
            .generator((timestamp) =>
              serviceInstance
                .transaction({ transactionName: appleTransaction.name })
                .errors(
                  serviceInstance
                    .crash({
                      message: 'crash 1',
                    })
                    .timestamp(timestamp)
                )
                .duration(1000)
                .timestamp(timestamp)
                .failure()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(bananaTransaction.successRate)
            .generator((timestamp) =>
              serviceInstance
                .transaction({ transactionName: bananaTransaction.name })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(bananaTransaction.failureRate)
            .generator((timestamp) =>
              serviceInstance
                .transaction({ transactionName: bananaTransaction.name })
                .errors(
                  serviceInstance
                    .crash({
                      message: 'crash 2',
                    })
                    .timestamp(timestamp)
                )
                .duration(1000)
                .timestamp(timestamp)
                .failure()
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('returns the correct data', () => {
        let errorGroups: ErrorGroups;
        before(async () => {
          const response = await callApi();
          errorGroups = response.body.errorGroups;
        });
        it('returns correct number of crashes', () => {
          expect(errorGroups.length).to.equal(2);
          expect(errorGroups.map((error) => error.name).sort()).to.eql(['crash 1', 'crash 2']);
        });

        it('returns correct occurrences', () => {
          const numberOfBuckets = 15;
          expect(errorGroups.map((error) => error.occurrences).sort()).to.eql([
            appleTransaction.failureRate * numberOfBuckets,
            bananaTransaction.failureRate * numberOfBuckets,
          ]);
        });
      });
    });
  });
}
