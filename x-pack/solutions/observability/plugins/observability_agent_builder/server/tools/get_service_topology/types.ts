/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TopologyDirection = 'downstream' | 'upstream' | 'both';

export interface ServiceTopologyNode {
  'service.name': string;
}

export interface ExternalNode {
  'span.destination.service.resource': string;
  'span.type': string;
  'span.subtype': string;
}

export interface ConnectionMetrics {
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}

export interface ServiceTopologyConnection {
  source: ServiceTopologyNode | ExternalNode;
  target: ServiceTopologyNode | ExternalNode;
  metrics: ConnectionMetrics | undefined;
}

export interface ServiceTopologyResponse {
  connections: ServiceTopologyConnection[];
}

export interface ConnectionWithKey extends ServiceTopologyConnection {
  _key: string;
  _sourceName: string;
  _dependencyName: string;
}
