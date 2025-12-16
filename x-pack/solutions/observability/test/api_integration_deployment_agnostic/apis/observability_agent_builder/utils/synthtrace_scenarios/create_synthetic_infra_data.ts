/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { infra, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  cloudProvider: string;
  cloudRegion: string;
}

/**
 * Creates synthetic infrastructure data for testing the get_hosts tool.
 */
export const createSyntheticInfraData = async ({
  getService,
  hosts,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  hosts: HostConfig[];
}) => {
  const synthtrace = getService('synthtrace');
  const infraSynthtraceEsClient = synthtrace.createInfraSynthtraceEsClient();

  await infraSynthtraceEsClient.clean();

  const from = moment().subtract(15, 'minutes');
  const to = moment();

  await infraSynthtraceEsClient.index(
    timerange(from, to)
      .interval('30s')
      .rate(1)
      .generator((timestamp) =>
        hosts.flatMap((hostConfig) => {
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
