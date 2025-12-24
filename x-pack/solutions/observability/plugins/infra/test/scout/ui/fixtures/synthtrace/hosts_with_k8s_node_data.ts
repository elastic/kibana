/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, timerange } from '@kbn/synthtrace-client';

export function generateHostsWithK8sNodeData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  // cpuValue is sent to the generator to simulate different 'system.cpu.total.norm.pct' metric
  // that is the default metric in inventory and hosts view and host details page
  const hosts = [
    {
      hostName: 'demo-stack-kubernetes-01',
      cpuValue: 0.5,
    },
  ];

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap(({ hostName, cpuValue }) => [
        infra.host(hostName).cpu({ 'system.cpu.total.norm.pct': cpuValue }).timestamp(timestamp),
        infra.host(hostName).memory().timestamp(timestamp),
        infra.host(hostName).network().timestamp(timestamp),
        infra.host(hostName).load().timestamp(timestamp),
        infra.host(hostName).filesystem().timestamp(timestamp),
        infra.host(hostName).diskio().timestamp(timestamp),
        infra.host(hostName).core().timestamp(timestamp),
        infra.host(hostName).node('demo-stack-kubernetes-01').metrics().timestamp(timestamp),
        infra.host(hostName).pod('pod-1').metrics().timestamp(timestamp),
      ])
    );
}
