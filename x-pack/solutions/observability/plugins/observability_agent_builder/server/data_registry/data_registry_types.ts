/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';

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

interface APMDownstreamDependency {
  'service.name'?: string | undefined;
  'span.destination.service.resource': string;
  'span.type'?: string | undefined;
  'span.subtype'?: string | undefined;
}

interface APMError {
  downstreamServiceResource: string | undefined;
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
  culprit: string | undefined;
  handled: boolean | undefined;
  type: string | undefined;
  traceId: string | undefined;
}

export interface ObservabilityAgentDataRegistryTypes {
  apmErrors: (params: {
    request: KibanaRequest;
    serviceName: string;
    serviceEnvironment: string;
    start: string;
    end: string;
  }) => Promise<APMError[]>;

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
}
