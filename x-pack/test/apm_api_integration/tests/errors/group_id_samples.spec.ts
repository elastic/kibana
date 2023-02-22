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
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { config, generateData } from './generate_data';

type ErrorGroupSamples =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples'>;

type ErrorSampleDetails =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callErrorGroupSamplesApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples',
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

  registry.when('when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await callErrorGroupSamplesApi();
      expect(response.status).to.be(200);
      expect(response.body.occurrencesCount).to.be(0);
    });
  });

  registry.when('when samples data is loaded', { config: 'basic', archives: [] }, () => {
    const { bananaTransaction } = config;
    describe('error group id', () => {
      before(async () => {
        await generateData({ serviceName, start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      describe('return correct data', () => {
        let errorsSamplesResponse: ErrorGroupSamples;
        before(async () => {
          const response = await callErrorGroupSamplesApi({
            path: { groupId: '0000000000000000000000000Error 1' },
          });
          errorsSamplesResponse = response.body;
        });

        it('displays correct number of occurrences', () => {
          const numberOfBuckets = 15;
          expect(errorsSamplesResponse.occurrencesCount).to.equal(
            bananaTransaction.failureRate * numberOfBuckets
          );
        });
      });
    });
  });

  registry.when('when error sample data is loaded', { config: 'basic', archives: [] }, () => {
    describe('error sample id', () => {
      before(async () => {
        await generateData({ serviceName, start, end, synthtraceEsClient });
      });

      after(() => synthtraceEsClient.clean());

      describe('return correct data', () => {
        let errorSampleDetailsResponse: ErrorSampleDetails;
        before(async () => {
          const errorsSamplesResponse = await callErrorGroupSamplesApi({
            path: { groupId: '0000000000000000000000000Error 1' },
          });

          const errorId = errorsSamplesResponse.body.errorSampleIds[0];

          const response = await callErrorSampleDetailsApi(errorId);
          errorSampleDetailsResponse = response.body;
        });

        it('displays correct error sample data', () => {
          expect(errorSampleDetailsResponse.error.error.grouping_key).to.equal(
            '0000000000000000000000000Error 1'
          );
          expect(errorSampleDetailsResponse.error.error.exception?.[0].message).to.equal('Error 1');
        });
      });
    });
  });
}
