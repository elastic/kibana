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
} from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorsDistribution =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
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
      const { bananaTransaction } = config;
      describe('error group id', () => {
        before(async () => {
          await generateData({ serviceName, start, end, synthtraceEsClient });
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
