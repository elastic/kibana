/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, infra, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export interface HostConfig {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  cloudProvider: string;
  cloudRegion: string;
  services?: string[];
}

/**
 * Creates synthetic infrastructure data for testing the get_hosts tool.
 * Optionally also creates APM traces for services running on the hosts,
 * which enables filtering hosts by service.name.
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
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await infraSynthtraceEsClient.clean();
  await apmSynthtraceEsClient.clean();

  const from = moment().subtract(15, 'minutes');
  const to = moment();

  // Index infrastructure metrics data
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

  // Index APM traces for hosts that have services defined
  const hostsWithServices = hosts.filter(
    (hostConfig) => hostConfig.services && hostConfig.services.length > 0
  );

  if (hostsWithServices.length > 0) {
    await apmSynthtraceEsClient.index(
      timerange(from, to)
        .interval('1m')
        .rate(5)
        .generator((timestamp) =>
          hostsWithServices.flatMap((hostConfig) =>
            (hostConfig.services ?? []).flatMap((serviceName) => {
              const instance = apm
                .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
                .instance(`${serviceName}-instance`)
                // Use overrides instead of defaults to override the host.name
                // that was set by .instance() to the actual host name
                .overrides({ 'host.name': hostConfig.name });

              return instance
                .transaction({ transactionName: 'GET /api/health' })
                .timestamp(timestamp)
                .duration(100)
                .success();
            })
          )
        )
    );
  }

  return { infraSynthtraceEsClient, apmSynthtraceEsClient };
};
