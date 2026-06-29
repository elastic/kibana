/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';

// ------------------------------------------------------------------ types

export type NodeHealth = 'healthy' | 'good' | 'degraded' | 'poor';

export interface SourceNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  eps: string;
  lag: string;
  health: NodeHealth;
  shipperType: string;
  policy: string;
  streamType: 'ingest-time' | 'query-time';
}

export interface TransformNodeData extends Record<string, unknown> {
  label: string;
}

export interface DestinationNodeData extends Record<string, unknown> {
  label: string;
  eps: string;
  lag: string;
  health: NodeHealth;
  destinationType: 'elastic' | 's3';
  subStreams?: number;
}

export type FabricNode =
  | Node<SourceNodeData, 'source'>
  | Node<TransformNodeData, 'transform'>
  | Node<DestinationNodeData, 'destination'>;

export interface DetailPayload {
  id: string;
  title: string;
  subtitle: string;
  throughput: string;
  lag: string;
  errors: string;
  alerts: string;
  mode: string;
  schema: string;
  owner: string;
  streamLang: string;
  sources: string[];
  outgoing: string[];
}

// ------------------------------------------------------------------ nodes

export const MOCK_NODES: FabricNode[] = [
  // sources
  {
    id: 'src-elastic-nginx',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'Elastic Agent • NGINX',
      description: 'Push',
      eps: '11.9k eps',
      lag: '180ms',
      health: 'healthy',
      shipperType: 'Elastic Agent',
      policy: 'prod-web-fleet',
      streamType: 'ingest-time',
    },
  },
  {
    id: 'src-myapp-log',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'myapp.log',
      description: 'Push custom logs',
      eps: '11.9k eps',
      lag: '180ms',
      health: 'healthy',
      shipperType: 'Filebeat',
      policy: 'edot-collectors-prod',
      streamType: 'ingest-time',
    },
  },
  {
    id: 'src-otel',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'OpenTelemetry',
      description: 'Description',
      eps: '11.9k eps',
      lag: '180ms',
      health: 'healthy',
      shipperType: 'OpenTelemetry',
      policy: 'platform-app-hosts',
      streamType: 'ingest-time',
    },
  },
  {
    id: 'src-s3',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'S3 bucket',
      description: 'Description',
      eps: '11.9k eps',
      lag: '180ms',
      health: 'degraded',
      shipperType: 'AWS',
      policy: 'network-edge-syslog',
      streamType: 'query-time',
    },
  },
  {
    id: 'src-syslog',
    type: 'source',
    position: { x: 0, y: 0 },
    data: {
      label: 'Syslog',
      description: 'Description',
      eps: '11.9k eps',
      lag: '180ms',
      health: 'healthy',
      shipperType: 'Fluent Bit',
      policy: 'agentless',
      streamType: 'ingest-time',
    },
  },

  // transforms
  {
    id: 'tx-nginx',
    type: 'transform',
    position: { x: 0, y: 0 },
    data: { label: 'nginx-transform' },
  },
  {
    id: 'tx-myapp',
    type: 'transform',
    position: { x: 0, y: 0 },
    data: { label: 'myapp-transform' },
  },
  {
    id: 'tx-multi',
    type: 'transform',
    position: { x: 0, y: 0 },
    data: { label: 'multi-transform' },
  },

  // destinations
  {
    id: 'dst-nginx-access',
    type: 'destination',
    position: { x: 0, y: 0 },
    data: {
      label: 'nginx-access',
      eps: '90d • 3k eps • 180ms',
      lag: '',
      health: 'good',
      destinationType: 'elastic',
    },
  },
  {
    id: 'dst-nginx-error',
    type: 'destination',
    position: { x: 0, y: 0 },
    data: {
      label: 'nginx-error',
      eps: '90d • 3k eps • 180ms',
      lag: '',
      health: 'degraded',
      destinationType: 'elastic',
    },
  },
  {
    id: 'dst-app-logs',
    type: 'destination',
    position: { x: 0, y: 0 },
    data: {
      label: 'app-logs',
      eps: '90d • 3k eps • 180ms',
      lag: '',
      health: 'good',
      destinationType: 'elastic',
    },
  },
  {
    id: 'dst-logs-prod',
    type: 'destination',
    position: { x: 0, y: 0 },
    data: {
      label: 'logs-prod',
      eps: '90d • 3k eps • 180ms',
      lag: '',
      health: 'good',
      destinationType: 'elastic',
      subStreams: 2,
    },
  },
  {
    id: 'dst-logs-dev',
    type: 'destination',
    position: { x: 0, y: 0 },
    data: {
      label: 'logs-dev',
      eps: '90d • 3k eps • 180ms',
      lag: '',
      health: 'good',
      destinationType: 'elastic',
    },
  },
];

// ------------------------------------------------------------------ edges

export const MOCK_EDGES: Edge[] = [
  // source → transform
  { id: 'e-en-tx-nginx', source: 'src-elastic-nginx', target: 'tx-nginx' },
  { id: 'e-myapp-tx-myapp', source: 'src-myapp-log', target: 'tx-myapp' },
  { id: 'e-otel-tx-multi', source: 'src-otel', target: 'tx-multi' },
  { id: 'e-s3-tx-multi', source: 'src-s3', target: 'tx-multi' },
  { id: 'e-syslog-tx-multi', source: 'src-syslog', target: 'tx-multi' },

  // transform → destination
  {
    id: 'e-tx-nginx-access',
    source: 'tx-nginx',
    target: 'dst-nginx-access',
    label: 'when x = y',
  },
  {
    id: 'e-tx-nginx-error',
    source: 'tx-nginx',
    target: 'dst-nginx-error',
    label: 'when x = y',
  },
  { id: 'e-tx-myapp-app-logs', source: 'tx-myapp', target: 'dst-app-logs' },
  {
    id: 'e-tx-multi-logs-prod',
    source: 'tx-multi',
    target: 'dst-logs-prod',
    label: 'when x = y',
  },
  {
    id: 'e-tx-multi-logs-dev',
    source: 'tx-multi',
    target: 'dst-logs-dev',
    label: 'when x = y',
  },
];

// ------------------------------------------------------------------ sidebar filters

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export const SHIPPER_TYPE_OPTIONS: FilterOption[] = [
  { id: 'Elastic Agent', label: 'Elastic Agent', count: 14 },
  { id: 'Filebeat', label: 'Filebeat', count: 9 },
  { id: 'Fluent Bit', label: 'Fluent Bit', count: 8 },
  { id: 'Kubernetes', label: 'Kubernetes', count: 3 },
  { id: 'OpenTelemetry', label: 'OpenTelemetry', count: 2 },
  { id: 'AWS', label: 'AWS', count: 8 },
];

export const POLICY_OPTIONS: FilterOption[] = [
  { id: 'prod-web-fleet', label: 'prod-web-fleet' },
  { id: 'edot-collectors-prod', label: 'edot-collectors-prod' },
  { id: 'network-edge-syslog', label: 'network-edge-syslog' },
  { id: 'agentless', label: 'agentless', count: 3 },
  { id: 'agentless-saas', label: 'agentless-saas', count: 2 },
  { id: 'platform-app-hosts', label: 'platform-app-hosts' },
];

export const STREAM_TYPE_OPTIONS: FilterOption[] = [
  { id: 'ingest-time', label: 'Ingest-time' },
  { id: 'query-time', label: 'Query-time' },
];

export const DESTINATION_OPTIONS: FilterOption[] = [
  { id: 'elastic', label: 'Elastic', count: 14 },
  { id: 's3', label: 'S3', count: 1 },
];

// ------------------------------------------------------------------ detail payloads

export const DETAIL_PAYLOADS: Record<string, DetailPayload> = {
  'tx-nginx': {
    id: 'tx-nginx',
    title: 'Inflight transformation',
    subtitle: 'Single transformation step owns normalization, PII redaction, conditional fanout',
    throughput: '51.7k eps',
    lag: 'p95 22ms',
    errors: '0.1%',
    alerts: '0',
    mode: 'Lorem ipsum dolor',
    schema: 'Lorem ipsum dolor',
    owner: 'Lorem ipsum dolor',
    streamLang: `normalize: ecs filter:
route:
  - redact_pii: [user.email, user-ip]
  - when: key >= value
    to: [logs-prod, logs-prod.errors]
  - when: source == 'syslog' to: [logs-prod]
  - default: logs-prod`,
    sources: ['OpenTelemetry', 'S3 Bucket', 'Syslog'],
    outgoing: ['logs-prod (2 sub-streams)', 'logs-dev'],
  },
  'tx-myapp': {
    id: 'tx-myapp',
    title: 'Inflight transformation',
    subtitle: 'Parses and enriches application log events',
    throughput: '11.9k eps',
    lag: 'p95 18ms',
    errors: '0.0%',
    alerts: '0',
    mode: 'Passthrough',
    schema: 'ECS 8.x',
    owner: 'platform-team',
    streamLang: `normalize: ecs filter:
route:
  - default: app-logs`,
    sources: ['myapp.log'],
    outgoing: ['app-logs'],
  },
  'src-elastic-nginx': {
    id: 'src-elastic-nginx',
    title: 'Elastic Agent • NGINX',
    subtitle: 'Push integration via Elastic Agent fleet policy',
    throughput: '11.9k eps',
    lag: 'p95 180ms',
    errors: '0.0%',
    alerts: '0',
    mode: 'Push',
    schema: 'ECS 8.x',
    owner: 'obs-platform',
    streamLang: '',
    sources: [],
    outgoing: ['nginx-access', 'nginx-error'],
  },
  'src-s3': {
    id: 'src-s3',
    title: 'S3 bucket',
    subtitle: 'Polling S3 for log files — currently degraded',
    throughput: '11.9k eps',
    lag: 'p95 240ms',
    errors: '2.1%',
    alerts: '1',
    mode: 'Poll',
    schema: 'Custom',
    owner: 'cloud-team',
    streamLang: '',
    sources: [],
    outgoing: ['logs-prod'],
  },
};

// ------------------------------------------------------------------ summary stats

export const SUMMARY_STATS = {
  sources: 6,
  flows: 3,
  destinations: 7,
  externalDestinations: 2,
  totalDocs: '1,912,123',
  good: 6,
  degraded: 1,
  poor: 0,
};
