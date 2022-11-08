/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import expect from '@kbn/expect';
import { sumBy } from 'lodash';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { config, expectedValues, generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const numberOfTransactionsCreated = 15;

  async function callApi(serviceName: string, serverlessId?: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances`,
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          ...(serverlessId ? { serverlessId } : {}),
        },
      },
    });
  }

  registry.when('Serverless active instances', { config: 'basic', archives: [] }, () => {
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
      let activeInstances: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances'>;
      before(async () => {
        const response = await callApi('lambda-python');
        activeInstances = response.body;
      });

      it('returns correct values for all serverless functions', () => {
        pythonServerlessFunctionNames.forEach((name) => {
          const activeInstanceOverview = activeInstances.activeInstances.find(
            (item) => item.serverlessFunctionName === name
          );

          expect(activeInstanceOverview?.serverlessId).to.eql(`${serverlessId}${name}`);
          expect(activeInstanceOverview?.serverlessDurationAvg).to.eql(faasDuration);
          expect(activeInstanceOverview?.billedDurationAvg).to.eql(billedDurationMs);
          expect(activeInstanceOverview?.avgMemoryUsed).to.eql(expectedMemoryUsed);
          expect(activeInstanceOverview?.memorySize).to.eql(memoryTotal);
        });
      });
      describe('timeseries', () => {
        it('returns correct sum value', () => {
          const sumValue = sumBy(
            activeInstances?.timeseries?.filter((item) => item.y !== 0),
            'y'
          );
          expect(sumValue).to.equal(numberOfTransactionsCreated);
        });
      });
    });

    describe('detailed metrics', () => {
      let activeInstances: APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances'>;
      before(async () => {
        const response = await callApi(
          'lambda-python',
          `${serverlessId}${pythonServerlessFunctionNames[0]}`
        );
        activeInstances = response.body;
      });

      it('returns correct values for all serverless functions', () => {
        const activeInstanceOverview = activeInstances.activeInstances.find(
          (item) => item.serverlessFunctionName === pythonServerlessFunctionNames[0]
        );

        expect(activeInstanceOverview?.serverlessId).to.eql(
          `${serverlessId}${pythonServerlessFunctionNames[0]}`
        );
        expect(activeInstanceOverview?.serverlessDurationAvg).to.eql(faasDuration);
        expect(activeInstanceOverview?.billedDurationAvg).to.eql(billedDurationMs);
        expect(activeInstanceOverview?.avgMemoryUsed).to.eql(expectedMemoryUsed);
        expect(activeInstanceOverview?.memorySize).to.eql(memoryTotal);
      });
      describe('timeseries', () => {
        it('returns correct sum value', () => {
          const sumValue = sumBy(
            activeInstances?.timeseries?.filter((item) => item.y !== 0),
            'y'
          );
          expect(sumValue).to.equal(numberOfTransactionsCreated);
        });
      });
    });
  });
}
