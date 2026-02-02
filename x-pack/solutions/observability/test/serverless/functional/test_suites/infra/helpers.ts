/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, infra } from '@kbn/synthtrace-client';

export function generateHostData({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: Array<{ hostName: string; cpuValue?: number }>;
}) {
  const range = timerange(from, to);

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
      ])
    );
}

export function generatePodsData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const pods = Array(count)
    .fill(0)
    .map((_, idx) => infra.pod(`pod-${idx}`, `node-name-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      pods.flatMap((pod, idx) => [
        pod.metrics().timestamp(timestamp),
        pod.container(`container-${idx}`).metrics().timestamp(timestamp),
      ])
    );
}
