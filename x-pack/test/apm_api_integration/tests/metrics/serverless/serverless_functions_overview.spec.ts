/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { config, expectedValues, generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const numberOfTransactionsCreated = 15;

  async function callApi(serviceName: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview`,
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when('Serverless functions overview', { config: 'basic', archives: [] }, () => {
    const {
      memoryTotal,
      billedDurationMs,
      pythonServerlessFunctionNames,
      faasDuration,
      serverlessId,
    } = config;
    const { expectedMemoryUsed } = expectedValues;

    before(async () => {
      await generateData({ start, end, synthtraceEsClient });
    });

    after(() => synthtraceEsClient.clean());

    describe('Python service', () => {
      let functionsOverview: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview'>;
      before(async () => {
        const response = await callApi('lambda-python');
        functionsOverview = response.body;
      });
      it('returns correct number of serverless functions', () => {
        expect(
          functionsOverview.serverlessFunctionsOverview.map((item) => {
            return item.serverlessFunctionName;
          })
        ).to.eql(pythonServerlessFunctionNames);
      });
      it('returns correct values for all serverless functions', () => {
        pythonServerlessFunctionNames.forEach((name) => {
          const functionOverview = functionsOverview.serverlessFunctionsOverview.find(
            (item) => item.serverlessFunctionName === name
          );

          expect(functionOverview?.serverlessId).to.eql(`${serverlessId}${name}`);
          expect(functionOverview?.serverlessDurationAvg).to.eql(faasDuration);
          expect(functionOverview?.billedDurationAvg).to.eql(billedDurationMs);
          expect(functionOverview?.coldStartCount).to.eql(numberOfTransactionsCreated);
          expect(functionOverview?.avgMemoryUsed).to.eql(expectedMemoryUsed);
          expect(functionOverview?.memorySize).to.eql(memoryTotal);
        });
      });
    });
  });
}
