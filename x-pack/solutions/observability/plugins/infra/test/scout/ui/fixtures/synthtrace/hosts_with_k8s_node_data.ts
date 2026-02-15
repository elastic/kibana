/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infra, Serializable, timerange } from '@kbn/synthtrace-client';
import { K8S_HOST_NAME, K8S_HOSTS, K8S_POD_NAME } from '../constants';

export function generateHostsWithK8sNodeData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      K8S_HOSTS.flatMap(({ hostName, cpuValue }) => {
        // Generate BOTH ECS and semconv (OTel) format metrics to support testing both schemas
        
        // ============ SEMCONV (OTel) FORMAT ============
        // cpuValue is the target CPU usage (e.g., 0.5 = 50%)
        // Formula: cpuUsage = 1 - (idle + wait)
        // So: idle + wait = 1 - cpuValue
        const cpuIdleUtilization = (1 - cpuValue) * 0.8; // Most of non-used CPU is idle
        const cpuWaitUtilization = (1 - cpuValue) * 0.2; // Smaller portion is wait
        const cpuUserUtilization = cpuValue * 0.6; // 60% of used CPU is user
        const cpuSystemUtilization = cpuValue * 0.4; // 40% of used CPU is system

        const semconvBase = {
          'agent.id': `agent-${hostName}`,
          'host.hostname': hostName,
          '@timestamp': timestamp,
          'host.name': hostName,
          'host.os.name': 'linux',
          'resource.attributes.host.name': hostName,
          'resource.attributes.os.type': 'linux',
          'data_stream.dataset': 'hostmetricsreceiver.otel',
          'data_stream.type': 'metrics',
          'data_stream.namespace': 'default',
        };

        // CPU metrics with state dimension (OTel/semconv format)
        const semconvCpuDocs = [
          { state: 'idle', 'metrics.system.cpu.utilization': cpuIdleUtilization },
          { state: 'wait', 'metrics.system.cpu.utilization': cpuWaitUtilization },
          { state: 'user', 'metrics.system.cpu.utilization': cpuUserUtilization },
          { state: 'system', 'metrics.system.cpu.utilization': cpuSystemUtilization },
        ].map((cpu) => ({
          ...semconvBase,
          ...cpu,
          'metricset.name': 'cpu',
          'metrics.system.cpu.logical.count': 4,
          'metrics.system.cpu.load_average.1m': 0.752, // 0.752 / 4 = 18.8% normalized
        }));

        // Memory metrics
        const totalMemory = 16 * 1024 * 1024 * 1024; // 16GB
        const memUsed = totalMemory * 0.35; // 35% used
        const memFree = totalMemory - memUsed;

        const semconvMemDocs = [
          {
            state: 'used',
            'metrics.system.memory.utilization': 0.35,
            'metrics.system.memory.usage': memUsed,
          },
          {
            state: 'free',
            'metrics.system.memory.utilization': 0.65,
            'metrics.system.memory.usage': memFree,
          },
        ].map((mem) => ({
          ...semconvBase,
          ...mem,
          'metricset.name': 'memory',
        }));

        // Filesystem metrics
        const semconvDiskDoc = {
          ...semconvBase,
          'metricset.name': 'filesystem',
          'metrics.system.filesystem.utilization': 12.23, // 1223% as shown in test
        };

        // Network metrics
        const semconvNetworkDocs = [
          { direction: 'transmit', 'metrics.system.network.io': 1000000 },
          { direction: 'receive', 'metrics.system.network.io': 1000000 },
        ].map((net) => ({
          ...semconvBase,
          ...net,
          'metricset.name': 'network',
        }));

        const semconvDocs = [
          ...semconvCpuDocs,
          ...semconvMemDocs,
          semconvDiskDoc,
          ...semconvNetworkDocs,
        ].map((doc) => new Serializable(doc));

        // ============ ECS FORMAT (using infra client) ============
        // Generate ECS format data using the existing infra client methods
        const ecsDocs = [
          infra.host(hostName).cpu({ 'system.cpu.total.norm.pct': cpuValue }).timestamp(timestamp),
          infra.host(hostName).memory().timestamp(timestamp),
          infra.host(hostName).network().timestamp(timestamp),
          infra.host(hostName).load().timestamp(timestamp),
          infra.host(hostName).filesystem().timestamp(timestamp),
          infra.host(hostName).diskio().timestamp(timestamp),
          infra.host(hostName).core().timestamp(timestamp),
        ];

        // K8s node and pod metrics
        const k8sDocs = [
          infra.host(hostName).node(K8S_HOST_NAME).metrics().timestamp(timestamp),
          infra.host(hostName).pod(K8S_POD_NAME).metrics().timestamp(timestamp),
        ];

        // Return both ECS and semconv data so tests can work with either schema
        return [...semconvDocs, ...ecsDocs, ...k8sDocs];
      })
    );
}
