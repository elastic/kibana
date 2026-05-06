/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, timerange } from '@kbn/synthtrace-client';

export interface SemconvHost {
  hostName: string;
}

export const SEMCONV_HOSTS_DATA_FROM = '2024-01-01T00:00:00.000Z';
export const SEMCONV_HOSTS_DATA_TO = '2024-01-01T00:10:00.000Z';

export const SEMCONV_HOSTS: SemconvHost[] = [
  { hostName: 'semconv-host-1' },
  { hostName: 'semconv-host-2' },
];

/**
 * Generates Otel `hostmetricsreceiver.otel` host docs (cpu, memory, filesystem,
 * network) for the deployment-agnostic API integration tests. Mirrors the Scout
 * fixture under `plugins/infra/test/scout/ui/fixtures/synthtrace/semconv_host_data.ts`
 * but is parameterized for reuse across infra suites.
 */
export function generateSemconvHostsData({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: SemconvHost[];
}) {
  const range = timerange(from, to);
  const hostList = hosts.map(({ hostName }) => infra.semconvHost(hostName));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hostList.flatMap((host) => {
        // Stagger by 1 ms per doc — TSDB derives _id from dimensions that exclude
        // `state` / `direction`, so identical @timestamp + metricset = duplicate _id.
        const docs = [...host.cpu(), ...host.memory(), ...host.filesystem(), ...host.network()];
        return docs.map((doc, i) => doc.timestamp(timestamp + i));
      })
    );
}
