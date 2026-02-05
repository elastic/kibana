/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { generateShortId, log, timerange } from '@kbn/synthtrace-client';
import { LOG_LEVELS } from '../constants';

export function generateLogsDataForHostsOrContainers({
  from,
  to,
  hostNames,
  containerIds,
}:
  | {
      from: string;
      to: string;
    } & (
      | { hostNames: string[]; containerIds?: undefined }
      | { containerIds: string[]; hostNames?: undefined }
    )): SynthtraceGenerator<LogDocument> {
  const range = timerange(from, to);

  // Logs Data logic
  const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
  const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

  const CLUSTER = [
    { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
  ];

  return range
    .interval('10s')
    .rate(1)
    .generator((timestamp, indx) =>
      (hostNames ?? containerIds).flatMap((name) => {
        const logIndex = indx % LOG_LEVELS.length;
        const logConfig = log
          .create()
          .message(LOG_LEVELS[logIndex].message)
          .logLevel(LOG_LEVELS[logIndex].level);

        if (containerIds) {
          logConfig.containerId(name);
        } else {
          logConfig.hostName(name);
        }

        return logConfig
          .defaults({
            'trace.id': generateShortId(),
            'agent.name': 'synth-agent',
            'orchestrator.cluster.name': CLUSTER[logIndex].clusterName,
            'orchestrator.cluster.id': CLUSTER[logIndex].clusterId,
            'orchestrator.resource.id': generateShortId(),
            'cloud.provider': CLOUD_PROVIDERS[logIndex],
            'cloud.region': CLOUD_REGION[logIndex],
            'cloud.availability_zone': `${CLOUD_REGION[logIndex]}a`,
            'cloud.project.id': generateShortId(),
            'cloud.instance.id': generateShortId(),
            'log.file.path': `/logs/${generateShortId()}/error.txt`,
          })
          .timestamp(timestamp);
      })
    );
}
