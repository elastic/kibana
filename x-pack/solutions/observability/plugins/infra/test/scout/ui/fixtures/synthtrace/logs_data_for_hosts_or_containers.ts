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
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      (hostNames ?? containerIds).flatMap((name) => {
        const index = Math.floor(Math.random() * LOG_LEVELS.length);
        const logConfig = log
          .create()
          .message(LOG_LEVELS[index].message)
          .logLevel(LOG_LEVELS[index].level);

        if (containerIds) {
          logConfig.containerId(name);
        } else {
          logConfig.hostName(name);
        }

        return logConfig
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
