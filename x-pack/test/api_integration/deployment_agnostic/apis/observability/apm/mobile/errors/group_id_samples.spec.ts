/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { timerange } from '@kbn/apm-synthtrace-client';
import { service } from '@kbn/apm-synthtrace-client/src/lib/apm/service';
import { orderBy } from 'lodash';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorGroupSamples =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples'>;

type ErrorSampleDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callErrorGroupSamplesApi({ groupId }: { groupId: string }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples',
      params: {
        path: {
          serviceName,
          groupId,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
        },
      },
    });
    return response;
  }

  async function callErrorSampleDetailsApi(errorId: string) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
      params: {
        path: {
          serviceName,
          groupId: 'foo',
          errorId,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
        },
      },
    });
    return response;
  }

  describe('Group id samples', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
    });

    it('handles the empty state', async () => {
      const response = await callErrorGroupSamplesApi({ groupId: 'foo' });
      expect(response.status).to.be(200);
      expect(response.body.occurrencesCount).to.be(0);
    });

    describe('when samples data is loaded', () => {
      let errorsSamplesResponse: ErrorGroupSamples;
      const { bananaTransaction } = config;
      describe('error group id', () => {
        before(async () => {
          await generateData({ serviceName, start, end, apmSynthtraceEsClient });
          const response = await callErrorGroupSamplesApi({
            groupId: '0000000000000000000000000Error 1',
          });
          errorsSamplesResponse = response.body;
        });

        after(() => apmSynthtraceEsClient.clean());

        it('displays correct number of occurrences', () => {
          const numberOfBuckets = 15;
          expect(errorsSamplesResponse.occurrencesCount).to.equal(
            bananaTransaction.failureRate * numberOfBuckets
          );
        });
      });
    });

    // github.com/elastic/kibana/issues/177665
    describe('when error sample data is loaded', () => {
      describe('error sample id', () => {
        before(async () => {
          await generateData({ serviceName, start, end, apmSynthtraceEsClient });
        });

        after(() => apmSynthtraceEsClient.clean());

        describe('return correct data', () => {
          let errorSampleDetailsResponse: ErrorSampleDetails;
          before(async () => {
            const errorsSamplesResponse = await callErrorGroupSamplesApi({
              groupId: '0000000000000000000000000Error 1',
            });

            const errorId = errorsSamplesResponse.body.errorSampleIds[0];

            const response = await callErrorSampleDetailsApi(errorId);
            errorSampleDetailsResponse = response.body;
          });

          it('displays correct error grouping_key', () => {
            expect(errorSampleDetailsResponse.error.error.grouping_key).to.equal(
              '0000000000000000000000000Error 1'
            );
          });

          it('displays correct error message', () => {
            expect(errorSampleDetailsResponse.error.error.exception?.[0].message).to.equal(
              'Error 1'
            );
          });
        });
      });

      describe('with sampled and unsampled transactions', () => {
        let errorGroupSamplesResponse: ErrorGroupSamples;

        before(async () => {
          const instance = service(serviceName, 'production', 'go').instance('a');
          const errorMessage = 'Error 1';
          const groupId = '0000000000000000000000000Error 1';

          await apmSynthtraceEsClient.index([
            timerange(start, end)
              .interval('15m')
              .rate(1)
              .generator((timestamp) => {
                return [
                  instance
                    .transaction('GET /api/foo')
                    .duration(100)
                    .timestamp(timestamp)
                    .sample(false)
                    .errors(
                      instance.error({ message: errorMessage }).timestamp(timestamp),
                      instance.error({ message: errorMessage }).timestamp(timestamp + 1)
                    ),
                  instance
                    .transaction('GET /api/foo')
                    .duration(100)
                    .timestamp(timestamp)
                    .sample(true)
                    .errors(instance.error({ message: errorMessage }).timestamp(timestamp)),
                ];
              }),
          ]);

          errorGroupSamplesResponse = (await callErrorGroupSamplesApi({ groupId })).body;
        });

        after(() => apmSynthtraceEsClient.clean());

        it('returns the errors in the correct order (sampled first, then unsampled)', () => {
          const idsOfErrors = errorGroupSamplesResponse.errorSampleIds.map((id) =>
            parseInt(id, 10)
          );

          // this checks whether the order of indexing is different from the order that is returned
          // if it is not, scoring/sorting is broken
          expect(errorGroupSamplesResponse.errorSampleIds.length).to.be(3);
          expect(idsOfErrors).to.not.eql(orderBy(idsOfErrors));
        });
      });
    });
  });
}
