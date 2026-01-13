/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateShortId, log, timerange } from '@kbn/synthtrace-client';

export function generateLogsDataForHosts({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: Array<{ hostName: string }>;
}) {
  const range = timerange(from, to);

  // Logs Data logic
  const MESSAGE_LOG_LEVELS = [
    { message: 'A simple log', level: 'info' },
    { message: 'Yet another debug log', level: 'debug' },
    { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
  ];
  const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
  const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

  const CLUSTER = [
    { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
  ];

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap(({ hostName }) => {
        const index = Math.floor(Math.random() * MESSAGE_LOG_LEVELS.length);
        return log
          .create()
          .message(MESSAGE_LOG_LEVELS[index].message)
          .logLevel(MESSAGE_LOG_LEVELS[index].level)
          .hostName(hostName)
          .defaults({
            'trace.id': generateShortId(),
            'agent.name': 'synth-agent',
            'orchestrator.cluster.name': CLUSTER[index].clusterName,
            'orchestrator.cluster.id': CLUSTER[index].clusterId,
            'orchestrator.resource.id': generateShortId(),
            'cloud.provider': CLOUD_PROVIDERS[index],
            'cloud.region': CLOUD_REGION[index],
            'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
            'cloud.project.id': generateShortId(),
            'cloud.instance.id': generateShortId(),
            'log.file.path': `/logs/${generateShortId()}/error.txt`,
          })
          .timestamp(timestamp);
      })
    );
}
