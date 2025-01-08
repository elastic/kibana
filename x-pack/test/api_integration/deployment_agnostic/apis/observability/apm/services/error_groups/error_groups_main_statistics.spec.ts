/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { generateData, config } from './generate_data';

type ErrorGroupsMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/errors/groups/main_statistics`,
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

  describe('Error groups main statistics', () => {
    describe(' when data is not loaded', () => {
      it('handles empty state', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body.errorGroups).to.empty();
      });
    });

    describe('when data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      const { PROD_LIST_ERROR_RATE, PROD_ID_ERROR_RATE, ERROR_NAME_1, ERROR_NAME_2 } = config;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateData({ serviceName, start, end, apmSynthtraceEsClient });
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('returns the correct data', () => {
        let errorGroupMainStatistics: ErrorGroupsMainStatistics;
        before(async () => {
          const response = await callApi();
          errorGroupMainStatistics = response.body;
        });

        it('returns correct number of occurrences', () => {
          expect(errorGroupMainStatistics.errorGroups.length).to.equal(2);
          expect(errorGroupMainStatistics.errorGroups.map((error) => error.name).sort()).to.eql([
            ERROR_NAME_1,
            ERROR_NAME_2,
          ]);
        });

        it('returns correct occurences', () => {
          const numberOfBuckets = 15;
          expect(
            errorGroupMainStatistics.errorGroups.map((error) => error.occurrences).sort()
          ).to.eql([PROD_LIST_ERROR_RATE * numberOfBuckets, PROD_ID_ERROR_RATE * numberOfBuckets]);
        });

        it('has same last seen value as end date', () => {
          errorGroupMainStatistics.errorGroups.map((error) => {
            expect(error.lastSeen).to.equal(moment(end).startOf('minute').valueOf());
          });
        });
      });
    });
  });
}
