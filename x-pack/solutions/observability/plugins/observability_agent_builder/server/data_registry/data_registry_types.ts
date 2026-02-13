/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';

type ServiceHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface TimeseriesChangePoint {
  change_point?: number | undefined;
  r_value?: number | undefined;
  trend?: string | undefined;
  p_value?: number;
  date: string | undefined;
  type: ChangePointType;
}

interface ChangePointGrouping {
  title: string;
  grouping: string;
  changes: TimeseriesChangePoint[];
}

interface ServiceSummary {
  'service.name': string;
  'service.environment': string[];
  'agent.name'?: string;
  'service.version'?: string[];
  'language.name'?: string;
  'service.framework'?: string;
  instances: number;
  anomalies: unknown;
  alerts: Array<{ type?: string; started: string }>;
  deployments: Array<{ '@timestamp': string }>;
}

export interface APMDownstreamDependency {
  'service.name'?: string;
  'span.destination.service.resource': string;
  'span.type'?: string;
  'span.subtype'?: string;
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}

interface APMErrorSample {
  processor?: {
    event?: string;
  };
  error?: {
    id?: string;
    culprit?: string;
    grouping_key?: string;
    exception?: Array<{ type?: string }>;
  };
  trace?: {
    id?: string;
  };
}

interface APMTransaction {
  transaction?: {
    id?: string;
    name?: string;
    type?: string;
  };
  trace?: {
    id?: string;
  };
  service?: {
    name?: string;
  };
}

export interface ServicesItemsItem {
  serviceName: string;
  transactionType?: string;
  environments?: string[];
  agentName?: string;
  latency?: number | null;
  transactionErrorRate?: number;
  throughput?: number;
  healthStatus?: ServiceHealthStatus;
  alertsCount?: number;
}

interface ServicesItemsResponse {
  items: ServicesItemsItem[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}

// Infra host types
type InfraEntityMetricType =
  | 'cpu'
  | 'cpuV2'
  | 'normalizedLoad1m'
  | 'diskSpaceUsage'
  | 'memory'
  | 'memoryFree'
  | 'rx'
  | 'tx'
  | 'rxV2'
  | 'txV2';

type InfraEntityMetadataType = 'cloud.provider' | 'host.ip' | 'host.os.name';

interface InfraEntityMetrics {
  name: InfraEntityMetricType;
  value: number | null;
}

interface InfraEntityMetadata {
  name: InfraEntityMetadataType;
  value: string | number | null;
}

export interface InfraEntityMetricsItem {
  name: string;
  metrics: InfraEntityMetrics[];
  metadata: InfraEntityMetadata[];
  hasSystemMetrics: boolean;
  alertsCount?: number;
}

interface InfraHostsResponse {
  nodes: InfraEntityMetricsItem[];
}

export interface ObservabilityAgentBuilderDataRegistryTypes {
  apmErrorDetails: (params: {
    request: KibanaRequest;
    errorId: string;
    serviceName: string;
    serviceEnvironment: string;
    start: string;
    end: string;
    kuery?: string;
  }) => Promise<{ error?: APMErrorSample; transaction?: APMTransaction } | undefined>;

  apmServiceSummary: (params: {
    request: KibanaRequest;
    serviceName: string;
    serviceEnvironment: string;
    start: string;
    end: string;
    transactionType?: string;
  }) => Promise<ServiceSummary>;

  apmDownstreamDependencies: (params: {
    request: KibanaRequest;
    serviceName: string;
    serviceEnvironment: string;
    start: string;
    end: string;
  }) => Promise<APMDownstreamDependency[]>;

  apmExitSpanChangePoints: (params: {
    request: KibanaRequest;
    serviceName: string;
    serviceEnvironment: string;
    start: string;
    end: string;
  }) => Promise<ChangePointGrouping[]>;

  apmServiceChangePoints: (params: {
    request: KibanaRequest;
    serviceName: string;
    serviceEnvironment: string;
    transactionType?: string;
    transactionName?: string;
    start: string;
    end: string;
  }) => Promise<ChangePointGrouping[]>;

  servicesItems: (params: {
    request: KibanaRequest;
    environment?: string;
    kuery?: string;
    start: string;
    end: string;
    searchQuery?: string;
  }) => Promise<ServicesItemsResponse>;

  infraHosts: (params: {
    request: KibanaRequest;
    from: string;
    to: string;
    limit: number;
    query: Record<string, unknown> | undefined;
    hostNames?: string[];
  }) => Promise<InfraHostsResponse>;
}
