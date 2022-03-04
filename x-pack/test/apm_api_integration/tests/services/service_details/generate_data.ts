/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

export const dataConfig = {
  rate: 10,
  transaction: {
    name: 'GET /apple 🍎',
    duration: 1000,
  },
  service: {
    name: 'lambda-python-dev-hello',
    version: '$LATEST',
    runtime: {
      name: 'AWS_Lambda_python3.8',
      version: '3.8.11',
    },
    framework: 'AWS Lambda',
    agent: {
      name: 'python',
      version: '6.6.0',
    },
  },
  containerOs: 'linux',
  serverless: {
    firstFunctionName: 'my-function-1',
    secondFunctionName: 'my-function-2',
    faasTriggerType: 'other',
  },
  cloud: {
    provider: 'aws',
    availabilityZone: 'us-central1-c',
    region: 'us-east-1',
    machineType: 'e2-standard-4',
    projectName: 'elastic-observability',
    serviceName: 'lambda',
  },
};

export async function generateData({
  synthtraceEsClient,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const { rate, service, containerOs, serverless, cloud, transaction } = dataConfig;
  const {
    provider,
    availabilityZone,
    region,
    machineType,
    projectName,
    serviceName: cloudServiceName,
  } = cloud;
  const { faasTriggerType, firstFunctionName, secondFunctionName } = serverless;
  const { version, runtime, framework, agent, name: serviceName } = service;
  const { name: serviceRunTimeName, version: serviceRunTimeVersion } = runtime;
  const { name: agentName, version: agentVersion } = agent;

  const instance = apm.service(serviceName, 'production', agentName).instance('instance-a');

  const traceEvents = [
    timerange(start, end)
      .interval('30s')
      .rate(rate)
      .spans((timestamp) =>
        instance
          .transaction(transaction.name)
          .timestamp(timestamp)
          .defaults({
            'cloud.provider': provider,
            'cloud.project.name': projectName,
            'cloud.service.name': cloudServiceName,
            'cloud.availability_zone': availabilityZone,
            'cloud.machine.type': machineType,
            'cloud.region': region,
            'faas.id': `arn:aws:lambda:us-west-2:123456789012:function:${firstFunctionName}`,
            'faas.trigger.type': faasTriggerType,
            'host.os.platform': containerOs,
            'kubernetes.pod.uid': '48f4c5a5-0625-4bea-9d94-77ee94a17e70',
            'service.version': version,
            'service.runtime.name': serviceRunTimeName,
            'service.runtime.version': serviceRunTimeVersion,
            'service.framework.name': framework,
            'agent.version': agentVersion,
          })
          .duration(transaction.duration)
          .success()
          .serialize()
      ),
    timerange(start, end)
      .interval('30s')
      .rate(rate)
      .spans((timestamp) =>
        instance
          .transaction(transaction.name)
          .timestamp(timestamp)
          .defaults({
            'cloud.provider': provider,
            'cloud.project.name': projectName,
            'cloud.service.name': cloudServiceName,
            'cloud.availability_zone': availabilityZone,
            'cloud.machine.type': machineType,
            'cloud.region': region,
            'faas.id': `arn:aws:lambda:us-west-2:123456789012:function:${secondFunctionName}`,
            'faas.trigger.type': faasTriggerType,
            'host.os.platform': containerOs,
            'kubernetes.pod.uid': '48f4c5a5-0625-4bea-9d94-77ee94a17e70',
            'service.version': version,
            'service.runtime.name': serviceRunTimeName,
            'service.runtime.version': serviceRunTimeVersion,
            'service.framework.name': framework,
            'agent.version': agentVersion,
          })
          .duration(transaction.duration)
          .success()
          .serialize()
      ),
  ];

  await synthtraceEsClient.index(traceEvents);
}
