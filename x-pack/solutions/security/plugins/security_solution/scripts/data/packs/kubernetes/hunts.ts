/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hunt } from '../types';

export const hunts: Hunt[] = [
  {
    name: 'K8s - Secrets Accessed by Service Account',
    language: 'kuery',
    query: 'kubernetes.audit.verb: "get" and kubernetes.audit.objectRef.resource: "secrets"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0006',
        tacticName: 'Credential Access',
        technique: 'T1552.007',
        techniqueName: 'Container API',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:40:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'kubernetes.audit', namespace: 'default' },
        event: {
          action: 'get',
          category: ['configuration'],
          type: ['access'],
          outcome: 'success',
          kind: 'event',
          dataset: 'kubernetes.audit',
          module: 'kubernetes',
        },
        orchestrator: { cluster: { name: 'prod-us-east-1' }, namespace: 'kube-system' },
        user: { name: 'system:serviceaccount:kube-system:kube-scheduler' },
        kubernetes: {
          audit: {
            verb: 'get',
            objectRef: { resource: 'secrets', namespace: 'kube-system', name: 'scheduler-token' },
            responseStatus: { code: 200 },
            sourceIPs: ['192.0.2.1'],
            userAgent: 'kube-scheduler/v1.28.0',
            stage: 'ResponseComplete',
            level: 'Metadata',
          },
        },
        related: { user: ['system:serviceaccount:kube-system:kube-scheduler'] },
      },
    ],
  },
  {
    name: 'K8s - Pod Created with hostPID',
    language: 'kuery',
    query: 'kubernetes.audit.verb: "create" and kubernetes.audit.objectRef.resource: "pods"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0004',
        tacticName: 'Privilege Escalation',
        technique: 'T1611',
        techniqueName: 'Escape to Host',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:35:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'kubernetes.audit', namespace: 'default' },
        event: {
          action: 'create',
          category: ['configuration'],
          type: ['creation'],
          outcome: 'success',
          kind: 'event',
          dataset: 'kubernetes.audit',
          module: 'kubernetes',
        },
        orchestrator: { cluster: { name: 'prod-us-east-1' }, namespace: 'monitoring' },
        user: { name: 'system:serviceaccount:monitoring:prometheus' },
        kubernetes: {
          audit: {
            verb: 'create',
            objectRef: {
              resource: 'pods',
              namespace: 'monitoring',
              name: 'node-exporter-5xk2j',
            },
            responseStatus: { code: 201 },
            sourceIPs: ['192.0.2.5'],
            userAgent: 'helm/v3.14.0',
            stage: 'ResponseComplete',
            level: 'Metadata',
          },
        },
        related: { user: ['system:serviceaccount:monitoring:prometheus'] },
      },
    ],
  },
  {
    name: 'K8s - ClusterRoleBinding to cluster-admin',
    language: 'kuery',
    query:
      'kubernetes.audit.verb: "create" and kubernetes.audit.objectRef.resource: "clusterrolebindings"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0004',
        tacticName: 'Privilege Escalation',
        technique: 'T1078.001',
        techniqueName: 'Default Accounts',
      },
    ],
  },
  {
    name: 'K8s - ConfigMap Modified in kube-system',
    language: 'kuery',
    query: 'kubernetes.audit.verb: "patch" and kubernetes.audit.objectRef.namespace: "kube-system"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0005',
        tacticName: 'Defense Evasion',
        technique: 'T1562.001',
        techniqueName: 'Disable or Modify Tools',
      },
    ],
  },
  {
    name: 'K8s - Exec into Running Pod',
    language: 'kuery',
    query: 'kubernetes.audit.verb: "create" and kubernetes.audit.objectRef.subresource: "exec"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0002',
        tacticName: 'Execution',
        technique: 'T1609',
        techniqueName: 'Container Administration Command',
      },
    ],
  },
];
