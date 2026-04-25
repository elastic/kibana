/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, timerange } from '@kbn/synthtrace-client';
import { K8S_HOST_NAME, K8S_HOSTS, K8S_POD_NAME } from '../constants';

export function generateHostsWithK8sNodeData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      K8S_HOSTS.flatMap(({ hostName, cpuValue }) => [
        infra.host(hostName).cpu({ 'system.cpu.total.norm.pct': cpuValue }).timestamp(timestamp),
        infra.host(hostName).memory().timestamp(timestamp),
        infra.host(hostName).network().timestamp(timestamp),
        infra.host(hostName).load().timestamp(timestamp),
        infra.host(hostName).filesystem().timestamp(timestamp),
        infra.host(hostName).diskio().timestamp(timestamp),
        infra.host(hostName).core().timestamp(timestamp),
        infra.host(hostName).node(K8S_HOST_NAME).metrics().timestamp(timestamp),
        infra.host(hostName).pod(K8S_POD_NAME).metrics().timestamp(timestamp),
      ])
    );
}
