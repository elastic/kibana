/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type DataTableRecord } from '@kbn/discover-utils/types';

export const mockData = [
  {
    id: '1',
    raw: {},
    flattened: {
      'asset.risk': 89,
      'asset.name': 'kube-scheduler-cspm-control',
      'asset.criticality': 'high_impact',
      'asset.source': 'cloud-sec-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '2',
    raw: {},
    flattened: {
      'asset.risk': 88,
      'asset.name': 'elastic-agent-LK3r',
      'asset.criticality': 'low_impact',
      'asset.source': 'security-ci',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '3',
    raw: {},
    flattened: {
      'asset.risk': 89,
      'asset.name': 'app-server-1',
      'asset.criticality': 'high_impact',
      'asset.source': 'sa-testing',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '4',
    raw: {},
    flattened: {
      'asset.risk': 87,
      'asset.name': 'database-backup-control',
      'asset.criticality': 'high_impact',
      'asset.source': 'elastic-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '5',
    raw: {},
    flattened: {
      'asset.risk': 69,
      'asset.name': 'elastic-agent-XyZ3',
      'asset.criticality': 'low_impact',
      'asset.source': 'elastic-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '6',
    raw: {},
    flattened: {
      'asset.risk': 65,
      'asset.name': 'kube-controller-cspm-monitor',
      'asset.criticality': null,
      'asset.source': 'cloud-sec-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '7',
    raw: {},
    flattened: {
      'asset.risk': 89,
      'asset.name': 'storage-service-AWS-EU-1',
      'asset.criticality': 'medium_impact',
      'asset.source': 'cloud-sec-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '8',
    raw: {},
    flattened: {
      'asset.risk': 19,
      'asset.name': 'web-server-LB2',
      'asset.criticality': 'low_impact',
      'asset.source': 'cloud-sec-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
  {
    id: '9',
    raw: {},
    flattened: {
      'asset.risk': 85,
      'asset.name': 'DNS-controller-azure-sec',
      'asset.criticality': null,
      'asset.source': 'cloud-sec-dev',
      '@timestamp': '2025-01-01T00:00:00.000Z',
    },
  },
] as DataTableRecord[];
