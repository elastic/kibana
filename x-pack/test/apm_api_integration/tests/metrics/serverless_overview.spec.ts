/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(serviceName: string, agentName: string) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/metrics/charts`,
      params: {
        path: { serviceName },
        query: {
          environment: 'test',
          agentName,
          kuery: '',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          serviceRuntimeName: 'aws_lambda',
        },
      },
    });
  }

  registry.when(
    'Serverless metrics charts when data is loaded',
    { config: 'basic', archives: [] },
    () => {
      const MEMORY_TOTAL = 536870912; // 0.5gb;
      const MEMORY_FREE = 94371840; // ~0.08 gb;
      const BILLED_DURATION_MS = 4000;
      const FAAS_TIMEOUT_MS = 10000;
      const COLD_START_DURATION_PYTHON = 4000;
      const COLD_START_DURATION_NODE = 0;
      const FAAS_DURATION = 4000;
      const TRANSACTION_DURATION = 1000;

      const numberOfTransactionsCreated = 15;
      const numberOfPythonInstances = 2;

      before(async () => {
        const cloudFields = {
          'cloud.provider': 'aws',
          'cloud.service.name': 'lambda',
          'cloud.region': 'us-west-2',
        };

        const instanceLambdaPython = apm
          .serverlessFunction({
            serviceName: 'lambda-python',
            environment: 'test',
            agentName: 'python',
            functionName: 'fn-lambda-python',
          })
          .instance({ instanceName: 'instance_A', ...cloudFields });

        const instanceLambdaPython2 = apm
          .serverlessFunction({
            serviceName: 'lambda-python',
            environment: 'test',
            agentName: 'python',
            functionName: 'fn-lambda-python-2',
          })
          .instance({ instanceName: 'instance_A', ...cloudFields });

        const instanceLambdaNode = apm
          .serverlessFunction({
            serviceName: 'lambda-node',
            environment: 'test',
            agentName: 'nodejs',
            functionName: 'fn-lambda-node',
          })
          .instance({ instanceName: 'instance_B', ...cloudFields });

        const systemMemory = {
          free: MEMORY_FREE,
          total: MEMORY_TOTAL,
        };

        const transactionsEvents = timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => [
            instanceLambdaPython
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(true)
              .coldStartDuration(COLD_START_DURATION_PYTHON)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
            instanceLambdaPython2
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(true)
              .coldStartDuration(COLD_START_DURATION_PYTHON)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
            instanceLambdaNode
              .invocation()
              .billedDuration(BILLED_DURATION_MS)
              .coldStart(false)
              .coldStartDuration(COLD_START_DURATION_NODE)
              .faasDuration(FAAS_DURATION)
              .faasTimeout(FAAS_TIMEOUT_MS)
              .memory(systemMemory)
              .timestamp(timestamp)
              .duration(TRANSACTION_DURATION)
              .success(),
          ]);

        await synthtraceEsClient.index(transactionsEvents);
      });

      // after(() => synthtraceEsClient.clean());

      describe('test', () => {
        it('should ', () => {
          expect(true).to.be(true);
        });
      });
    }
  );
}
