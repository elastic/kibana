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
} from '../../../../../plugins/apm/public/services/rest/createCallApmApi';
import { RecursivePartial } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { generateData, config } from './generate_data';

type ErrorGroupsMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/error_groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/error_groups/main_statistics'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/error_groups/main_statistics`,
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Error groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await callApi();
        expect(response.status).to.be(200);
        expect(response.body.error_groups).to.empty();
        expect(response.body.is_aggregation_accurate).to.eql(true);
      });
    }
  );

  registry.when(
    'Error groups main statistics',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        const { PROD_LIST_ERROR_RATE, PROD_ID_ERROR_RATE, ERROR_NAME_1, ERROR_NAME_2 } = config;

        before(async () => {
          await generateData({ serviceName, start, end, synthtraceEsClient });
        });

        after(() => synthtraceEsClient.clean());

        describe('returns the correct data', () => {
          let errorGroupMainStatistics: ErrorGroupsMainStatistics;
          before(async () => {
            const response = await callApi();
            errorGroupMainStatistics = response.body;
          });

          it('returns correct number of occurrences', () => {
            expect(errorGroupMainStatistics.error_groups.length).to.equal(2);
            expect(errorGroupMainStatistics.error_groups.map((error) => error.name).sort()).to.eql([
              ERROR_NAME_1,
              ERROR_NAME_2,
            ]);
          });

          it('returns correct occurences', () => {
            const numberOfBuckets = 15;
            expect(
              errorGroupMainStatistics.error_groups.map((error) => error.occurrences).sort()
            ).to.eql([
              PROD_LIST_ERROR_RATE * numberOfBuckets,
              PROD_ID_ERROR_RATE * numberOfBuckets,
            ]);
          });

          it('has same last seen value as end date', () => {
            errorGroupMainStatistics.error_groups.map((error) => {
              expect(error.lastSeen).to.equal(moment(end).startOf('minute').valueOf());
            });
          });
        });
      });
    }
  );
}
