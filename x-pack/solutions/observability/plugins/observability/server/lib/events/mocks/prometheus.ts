/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEventInput } from '../../../../common/types/events';

export const PROMETHEUS_MOCKS: ExternalEventInput[] = [
  {
    title: 'High CPU Usage',
    message:
      'CPU usage exceeded 90% on instance node-1:9090. Current value: 94.5%. Job: node-exporter.',
    severity: 'critical',
    source: 'prometheus',
    status: 'open',
    tags: ['cpu', 'infrastructure', 'node-exporter'],
    raw_payload: {
      alertname: 'HighCPUUsage',
      instance: 'node-1:9090',
      job: 'node-exporter',
      severity: 'critical',
      value: 94.5,
    },
  },
  {
    title: 'Memory Pressure Warning',
    message:
      'Memory usage is at 85% on instance node-2:9090. Consider scaling or investigating memory leaks.',
    severity: 'high',
    source: 'prometheus',
    status: 'open',
    tags: ['memory', 'infrastructure', 'node-exporter'],
    raw_payload: {
      alertname: 'MemoryPressure',
      instance: 'node-2:9090',
      job: 'node-exporter',
      severity: 'warning',
      value: 85.2,
    },
  },
  {
    title: 'Disk Space Low',
    message:
      'Disk /dev/sda1 is 92% full on instance db-server:9090. Free space: 8GB remaining.',
    severity: 'high',
    source: 'prometheus',
    status: 'open',
    tags: ['disk', 'storage', 'node-exporter'],
    raw_payload: {
      alertname: 'DiskSpaceLow',
      instance: 'db-server:9090',
      job: 'node-exporter',
      device: '/dev/sda1',
      severity: 'warning',
      value: 92,
    },
  },
  {
    title: 'Pod CrashLoopBackOff',
    message:
      'Pod api-gateway-7d8f9c6b5-x2k9m in namespace production is in CrashLoopBackOff state. Restart count: 15.',
    severity: 'critical',
    source: 'prometheus',
    status: 'open',
    tags: ['kubernetes', 'pod', 'crashloop'],
    raw_payload: {
      alertname: 'KubePodCrashLooping',
      namespace: 'production',
      pod: 'api-gateway-7d8f9c6b5-x2k9m',
      container: 'api-gateway',
      restart_count: 15,
    },
  },
  {
    title: 'High Request Latency',
    message:
      'P99 latency for /api/users endpoint exceeded 500ms. Current value: 1.2s. Service: user-service.',
    severity: 'medium',
    source: 'prometheus',
    status: 'open',
    tags: ['latency', 'api', 'performance'],
    raw_payload: {
      alertname: 'HighRequestLatency',
      endpoint: '/api/users',
      service: 'user-service',
      quantile: '0.99',
      value: 1.2,
    },
  },
];

