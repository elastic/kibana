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
import type { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { sumBy, first, last } from 'lodash';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace/src/lib/apm/client/apm_synthtrace_es_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { config, generateData } from './generate_data';
import { isFiniteNumber } from '../../utils/common';

type ErroneousTransactions =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const groupId = '0000000000000000000000000Error 1';

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint:
        'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions',
      params: {
        path: {
          serviceName,
          groupId,
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          offset: undefined,
          numBuckets: 15,
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  describe('Top erroneous transactions', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
    });

    it('handles the empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.topErroneousTransactions).to.be.empty();
    });

    describe('when data is loaded', () => {
      const {
        appleTransaction: { name: appleTransactionName, failureRate: appleTransactionFailureRate },
        bananaTransaction: {
          name: bananaTransactionName,
          failureRate: bananaTransactionFailureRate,
        },
      } = config;

      describe('returns the correct data', () => {
        describe('without comparison', () => {
          const numberOfBuckets = 15;
          let erroneousTransactions: ErroneousTransactions;

          before(async () => {
            await generateData({ serviceName, start, end, apmSynthtraceEsClient });
            const response = await callApi({
              path: { groupId },
            });
            erroneousTransactions = response.body;
          });

          it('displays the correct number of occurrences', () => {
            const { topErroneousTransactions } = erroneousTransactions;
            expect(topErroneousTransactions.length).to.be(2);

            const bananaTransaction = topErroneousTransactions.find(
              (x) => x.transactionName === bananaTransactionName
            );
            expect(bananaTransaction).to.not.be(undefined);
            expect(bananaTransaction?.occurrences).to.be(
              bananaTransactionFailureRate * numberOfBuckets
            );

            const appleTransaction = topErroneousTransactions.find(
              (x) => x.transactionName === appleTransactionName
            );
            expect(appleTransaction).to.not.be(undefined);
            expect(appleTransaction?.occurrences).to.be(
              appleTransactionFailureRate * numberOfBuckets
            );
          });

          it('displays the correct number of occurrences in time series', () => {
            const { topErroneousTransactions } = erroneousTransactions;

            const bananaTransaction = topErroneousTransactions.find(
              (x) => x.transactionName === bananaTransactionName
            );
            const firstErrorCount = sumBy(bananaTransaction?.currentPeriodTimeseries, 'y');
            expect(firstErrorCount).to.be(bananaTransactionFailureRate * numberOfBuckets);

            const appleTransaction = topErroneousTransactions.find(
              (x) => x.transactionName === appleTransactionName
            );
            const secondErrorCount = sumBy(appleTransaction?.currentPeriodTimeseries, 'y');
            expect(secondErrorCount).to.be(appleTransactionFailureRate * numberOfBuckets);
          });
        });

        describe('with comparison', () => {
          describe('when there are data for the time periods', () => {
            let erroneousTransactions: ErroneousTransactions;

            before(async () => {
              const fiveMinutes = 5 * 60 * 1000;
              const response = await callApi({
                path: { groupId },
                query: {
                  start: new Date(end - fiveMinutes).toISOString(),
                  end: new Date(end).toISOString(),
                  offset: '5m',
                },
              });
              erroneousTransactions = response.body;
            });

            it('returns some data', () => {
              const { topErroneousTransactions } = erroneousTransactions;

              const hasCurrentPeriodData =
                topErroneousTransactions[0]?.currentPeriodTimeseries.some(({ y }) =>
                  isFiniteNumber(y)
                );

              const hasPreviousPeriodData =
                topErroneousTransactions[0]?.previousPeriodTimeseries.some(({ y }) =>
                  isFiniteNumber(y)
                );

              expect(hasCurrentPeriodData).to.be(true);
              expect(hasPreviousPeriodData).to.be(true);
            });

            it('has the same start time for both periods', () => {
              const { topErroneousTransactions } = erroneousTransactions;
              expect(first(topErroneousTransactions[0]?.currentPeriodTimeseries)?.x).to.be(
                first(topErroneousTransactions[0]?.previousPeriodTimeseries)?.x
              );
            });

            it('has same end time for both periods', () => {
              const { topErroneousTransactions } = erroneousTransactions;
              expect(last(topErroneousTransactions[0]?.currentPeriodTimeseries)?.x).to.be(
                last(topErroneousTransactions[0]?.previousPeriodTimeseries)?.x
              );
            });

            it('returns same number of buckets for both periods', () => {
              const { topErroneousTransactions } = erroneousTransactions;
              expect(topErroneousTransactions[0]?.currentPeriodTimeseries.length).to.be(
                topErroneousTransactions[0]?.previousPeriodTimeseries.length
              );
            });
          });

          describe('when there are no data for the time period', () => {
            it('returns an empty array', async () => {
              const response = await callApi({
                path: { groupId },
                query: {
                  start: '2021-01-03T00:00:00.000Z',
                  end: '2021-01-03T00:15:00.000Z',
                  offset: '1d',
                },
              });

              const {
                body: { topErroneousTransactions },
              } = response;

              expect(topErroneousTransactions).to.be.empty();
            });
          });
        });
      });
    });

    after(() => apmSynthtraceEsClient.clean());
  });
}
