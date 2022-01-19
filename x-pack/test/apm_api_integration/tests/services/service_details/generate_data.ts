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
  service: {
    name: 'lambda-python-dev-hello',
    node: {
      name: '2022/01/18/[$LATEST]89634b0ffc884be0b4964a1f4c5d808c',
    },
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
  const { rate, service, containerOs, serverless, cloud } = dataConfig;
  const {
    provider,
    availabilityZone,
    region,
    machineType,
    projectName,
    serviceName: cloudServiceName,
  } = cloud;
  const { faasTriggerType } = serverless;
  const { version, runtime, framework, agent, node, name: serviceName } = service;
  const { name: serviceRunTimeName, version: serviceRunTimeVersion } = runtime;
  const { name: agentName, version: agentVersion } = agent;
  const { name: serviceNodeName } = node;

  const instance = apm.service(serviceName, 'production', agentName).instance('instance-a');

  const metricsets = timerange(start, end)
    .interval('30s')
    .rate(rate)
    .flatMap((timestamp) =>
      instance
        .appMetrics({})
        .timestamp(timestamp)
        .defaults({
          'cloud.provider': provider,
          'cloud.project.name': projectName,
          'cloud.service.name': cloudServiceName,
          'cloud.availability_zone': availabilityZone,
          'cloud.machine.type': machineType,
          'cloud.region': region,
          'service.name': serviceName,
          'faas.trigger.type': faasTriggerType,
          'host.os.platform': containerOs,
          'kubernetes.pod.uid': '48f4c5a5-0625-4bea-9d94-77ee94a17e70',
          'container.id': '37509fe749719a494218b24b000da50f90e7bfc5de9c45741c40a811f1a4d647',
          'service.version': version,
          'service.node.name': serviceNodeName,
          'service.runtime.name': serviceRunTimeName,
          'service.runtime.version': serviceRunTimeVersion,
          'service.framework.name': framework,
          'agent.name': agentName,
          'agent.version': agentVersion,
        })
        .serialize()
    );

  await synthtraceEsClient.index(metricsets);
}
