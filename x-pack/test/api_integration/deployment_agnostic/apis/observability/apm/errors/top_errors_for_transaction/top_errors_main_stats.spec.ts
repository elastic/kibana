/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import moment from 'moment';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace/src/lib/apm/client/apm_synthtrace_es_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorGroups =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'>['errorGroups'];

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint:
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name',
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          maxNumberOfErrorGroups: 5,
          transactionType: 'request',
          transactionName: overrides?.query?.transactionName ?? '',
          ...overrides?.query,
        },
      },
    });
  }

  describe('Top Errors main stats', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
    });

    it('handles empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.errorGroups).to.empty();
    });

    describe('when data is loaded', () => {
      let errorGroups: ErrorGroups;
      const {
        appleTransaction: { name: appleTransactionName, failureRate: appleTransactionFailureRate },
      } = config;
      describe('top errors for transaction', () => {
        before(async () => {
          await generateData({ serviceName, start, end, apmSynthtraceEsClient });
          const response = await callApi({ query: { transactionName: appleTransactionName } });
          errorGroups = response.body.errorGroups;
        });

        after(() => apmSynthtraceEsClient.clean());

        describe('returns the correct data', () => {
          const NUMBER_OF_BUCKETS = 15;

          it('returns correct number of errors', () => {
            expect(errorGroups.length).to.equal(2);
          });

          it('error 1 is correct', () => {
            const firstError = errorGroups[0];
            expect(firstError).to.not.be(undefined);
            expect(firstError?.name).to.be(`Error 1 transaction GET /apple 🍎`);
            expect(firstError?.occurrences).to.be(appleTransactionFailureRate * NUMBER_OF_BUCKETS);
            expect(firstError?.lastSeen).to.be(moment(end).startOf('minute').valueOf());
          });

          it('error 2 is correct', () => {
            const secondError = errorGroups[1];
            expect(secondError).to.not.be(undefined);
            expect(secondError?.name).to.be(`Error 2 transaction GET /apple 🍎`);
            expect(secondError?.occurrences).to.be(appleTransactionFailureRate * NUMBER_OF_BUCKETS);
            expect(secondError?.lastSeen).to.be(moment(end).startOf('minute').valueOf());
          });
        });
      });
    });
  });
}
