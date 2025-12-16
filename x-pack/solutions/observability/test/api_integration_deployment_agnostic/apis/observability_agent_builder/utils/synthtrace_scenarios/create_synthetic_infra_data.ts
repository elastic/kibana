/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { infra, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  cloudProvider: string;
  cloudRegion: string;
}

const DEFAULT_HOSTS: HostConfig[] = [
  {
    name: 'web-server-01',
    cpuUsage: 0.65,
    memoryUsage: 0.72,
    diskUsage: 0.45,
    cloudProvider: 'aws',
    cloudRegion: 'us-east-1',
  },
  {
    name: 'db-server-01',
    cpuUsage: 0.35,
    memoryUsage: 0.85,
    diskUsage: 0.68,
    cloudProvider: 'aws',
    cloudRegion: 'us-east-1',
  },
  {
    name: 'api-server-01',
    cpuUsage: 0.45,
    memoryUsage: 0.55,
    diskUsage: 0.25,
    cloudProvider: 'gcp',
    cloudRegion: 'us-central1',
  },
];

/**
 * Creates synthetic infrastructure data for testing the get_hosts tool.
 */
export const createSyntheticInfraData = async ({
  getService,
  hostNames,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  hostNames?: string[];
}) => {
  const synthtrace = getService('synthtrace');
  const infraSynthtraceEsClient = synthtrace.createInfraSynthtraceEsClient();

  await infraSynthtraceEsClient.clean();

  const from = moment().subtract(15, 'minutes');
  const to = moment();

  // Use custom host names with default profiles, or use defaults
  const hostConfigs = hostNames
    ? hostNames.map((name, idx) => ({
        ...DEFAULT_HOSTS[idx % DEFAULT_HOSTS.length],
        name,
      }))
    : DEFAULT_HOSTS;

  await infraSynthtraceEsClient.index(
    timerange(from, to)
      .interval('30s')
      .rate(1)
      .generator((timestamp) =>
        hostConfigs.flatMap((hostConfig) => {
          const host = infra.host(hostConfig.name);
          const totalMemory = 68_719_476_736; // 64GB
          const usedMemory = Math.floor(totalMemory * hostConfig.memoryUsage);

          const defaults = {
            'agent.id': 'synthtrace',
            'host.name': hostConfig.name,
            'host.hostname': hostConfig.name,
            'cloud.provider': hostConfig.cloudProvider,
            'cloud.region': hostConfig.cloudRegion,
          };

          return [
            host
              .cpu({ 'system.cpu.total.norm.pct': hostConfig.cpuUsage })
              .defaults(defaults)
              .timestamp(timestamp),
            host
              .memory({
                'system.memory.actual.free': totalMemory - usedMemory,
                'system.memory.actual.used.bytes': usedMemory,
                'system.memory.actual.used.pct': hostConfig.memoryUsage,
                'system.memory.total': totalMemory,
              })
              .defaults(defaults)
              .timestamp(timestamp),
            host.network().defaults(defaults).timestamp(timestamp),
            host.load().defaults(defaults).timestamp(timestamp),
            host
              .filesystem({ 'system.filesystem.used.pct': hostConfig.diskUsage })
              .defaults(defaults)
              .timestamp(timestamp),
            host.diskio().defaults(defaults).timestamp(timestamp),
          ];
        })
      )
  );

  return { infraSynthtraceEsClient };
};
