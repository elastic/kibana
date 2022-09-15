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
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import moment from 'moment';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorGroups =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'>['errorGroups'];

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

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
          transactionName: '',
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

  registry.when('when data is loaded', { config: 'basic', archives: [] }, () => {
    describe('top errors for transaction', () => {
      const {
        firstTransaction: { name: firstTransactionName, failureRate: firstTransactionFailureRate },
      } = config;

      before(async () => {
        await generateData({ serviceName, start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      describe('returns the correct data', () => {
        let errorGroups: ErrorGroups;
        before(async () => {
          const response = await callApi({ query: { transactionName: firstTransactionName } });
          errorGroups = response.body.errorGroups;
        });

        it('returns correct number of errors and error data', () => {
          const numberOfBuckets = 15;

          expect(errorGroups.length).to.equal(2);

          const firstErrorId = `Error 1 transaction ${firstTransactionName}`;
          const firstError = errorGroups.find((x) => x.groupId === firstErrorId);
          expect(firstError).to.not.be(undefined);
          expect(firstError?.groupId).to.be(firstErrorId);
          expect(firstError?.name).to.be(firstErrorId);
          expect(firstError?.occurrences).to.be(firstTransactionFailureRate * numberOfBuckets);
          expect(firstError?.lastSeen).to.be(moment(end).startOf('minute').valueOf());

          const secondErrorId = `Error 2 transaction ${firstTransactionName}`;
          const secondError = errorGroups.find((x) => x.groupId === secondErrorId);
          expect(secondError).to.not.be(undefined);
          expect(secondError?.groupId).to.be(secondErrorId);
          expect(secondError?.name).to.be(secondErrorId);
          expect(secondError?.occurrences).to.be(firstTransactionFailureRate * numberOfBuckets);
          expect(secondError?.lastSeen).to.be(moment(end).startOf('minute').valueOf());
        });
      });
    });
  });
}
