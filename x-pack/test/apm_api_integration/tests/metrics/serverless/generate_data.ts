/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const config = {
  memoryTotal: 536870912, // 0.5gb
  memoryFree: 94371840, // ~0.08 gb
  billedDurationMs: 4000,
  faasTimeoutMs: 10000,
  coldStartDurationPython: 4000,
  faasDuration: 4000,
  transactionDuration: 1000,
  pythonServerlessFunctionNames: ['fn-lambda-python', 'fn-lambda-python-2'],
  pythonInstanceName: 'instance_A',
  serverlessId: 'arn:aws:lambda:us-west-2:001:function:',
};

export const expectedValues = {
  expectedMemoryUsedRate: (config.memoryTotal - config.memoryFree) / config.memoryTotal,
  expectedMemoryUsed: config.memoryTotal - config.memoryFree,
};

export async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const {
    memoryTotal,
    memoryFree,
    billedDurationMs,
    faasTimeoutMs,
    coldStartDurationPython,
    faasDuration,
    transactionDuration,
    pythonServerlessFunctionNames,
    pythonInstanceName,
  } = config;

  const cloudFields = {
    'cloud.provider': 'aws',
    'cloud.service.name': 'lambda',
    'cloud.region': 'us-west-2',
  };

  const [instanceLambdaPython, instanceLambdaPython2] = pythonServerlessFunctionNames.map(
    (functionName) => {
      return apm
        .serverlessFunction({
          serviceName: 'lambda-python',
          environment: 'test',
          agentName: 'python',
          functionName,
        })
        .instance({ instanceName: pythonInstanceName, ...cloudFields });
    }
  );

  const instanceLambdaNode = apm
    .serverlessFunction({
      serviceName: 'lambda-node',
      environment: 'test',
      agentName: 'nodejs',
      functionName: 'fn-lambda-node',
    })
    .instance({ instanceName: 'instance_B', ...cloudFields });

  const systemMemory = {
    free: memoryFree,
    total: memoryTotal,
  };

  const transactionsEvents = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => [
      instanceLambdaPython
        .invocation()
        .billedDuration(billedDurationMs)
        .coldStart(true)
        .coldStartDuration(coldStartDurationPython)
        .faasDuration(faasDuration)
        .faasTimeout(faasTimeoutMs)
        .memory(systemMemory)
        .timestamp(timestamp)
        .duration(transactionDuration)
        .success(),
      instanceLambdaPython2
        .invocation()
        .billedDuration(billedDurationMs)
        .coldStart(true)
        .coldStartDuration(coldStartDurationPython)
        .faasDuration(faasDuration)
        .faasTimeout(faasTimeoutMs)
        .memory(systemMemory)
        .timestamp(timestamp)
        .duration(transactionDuration)
        .success(),
      instanceLambdaNode
        .invocation()
        .billedDuration(billedDurationMs)
        .coldStart(false)
        .faasDuration(faasDuration)
        .faasTimeout(faasTimeoutMs)
        .memory(systemMemory)
        .timestamp(timestamp)
        .duration(transactionDuration)
        .success(),
    ]);

  await apmSynthtraceEsClient.index(transactionsEvents);
}
