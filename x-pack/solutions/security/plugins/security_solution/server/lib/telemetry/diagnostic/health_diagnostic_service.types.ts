/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, ElasticsearchClient } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { CircuitBreakerResult } from './health_diagnostic_circuit_breakers.types';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
export { NotAllowedError } from './health_diagnostic_errors';

/**
 * Enum defining the types of actions that can be applied to data,
 * such as masking or keeping the original value, as part of the
 * filterlist transformation.
 */

export enum Action {
  /**
   * Represents an action to mask sensitive information.
   */
  MASK = 'mask',
  /**
   * Represents an action to keep information as is, without masking.
   */
  KEEP = 'keep',
  /**
   * Represents an action to encrypt sensitive information.
   */
  ENCRYPT = 'encrypt',
}

/**
 * Enumeration of the supported query types.
 */
export enum QueryType {
  /**
   * Core Elasticsearch API JSON queries (/_search).
   */
  DSL = 'DSL',
  /**
   * Event Query Language
   * */
  EQL = 'EQL',
  /**
   * Elasticsearch Query Language (ES|QL).
   */
  ESQL = 'ESQL',
}

export interface HealthDiagnosticServiceSetup {
  taskManager: TaskManagerSetupContract;
  isServerless: boolean;
}

export interface HealthDiagnosticServiceStart {
  taskManager: TaskManagerStartContract;
  esClient: ElasticsearchClient;
  analytics: AnalyticsServiceStart;
  telemetryConfigProvider: TelemetryConfigProvider;
  packageService: PackageService;
}

export interface HealthDiagnosticService {
  setup(setup: HealthDiagnosticServiceSetup): void;
  start(start: HealthDiagnosticServiceStart): Promise<void>;
  runHealthDiagnosticQueries(
    lastExecutionByQuery: Record<string, number>
  ): Promise<HealthDiagnosticQueryStats[]>;
}

/**
 * Configuration interface for Health Diagnostic query execution.
 */
export interface HealthDiagnosticQueryConfig {
  /** Maximum number of documents to process per query execution. Default: 100,000,000 */
  maxDocuments: number;
  /** Number of documents to buffer before sending to EBT. Default: 10,000 */
  bufferSize: number;
}

/**
 * An index-targeting diagnostic query. Produced from v1, v2, and v3 DSL/EQL/ESQL
 * descriptors. Exactly one of `index` or `integrations` is set.
 */
export interface IndexQuery {
  kind: 'index';
  id: string;
  name: string;
  scheduleCron: string;
  filterlist: Record<string, Action>;
  enabled: boolean;
  type: QueryType;
  query: string;
  size?: number;
  tiers?: string[];
  index?: string;
  integrations?: string[];
  datastreamTypes?: string[];
  encryptionKeyId?: string;
  encryptDocument?: true;
  expiresAt?: string;
}

/**
 * An ES HTTP API diagnostic query. Produced from v3 API descriptors.
 */
export interface ApiQuery {
  kind: 'api';
  id: string;
  name: string;
  scheduleCron: string;
  filterlist: Record<string, Action>;
  enabled: boolean;
  api: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string | number>;
  responsePath?: string;
  responsePathKey?: string;
  integrations?: string[];
  encryptionKeyId?: string;
  encryptDocument?: true;
  expiresAt?: string;
}

/**
 * Produced when the parser fails to produce a valid descriptor.
 *
 * `unknown_version` — the descriptor carries a version number the current code
 * does not recognise (future descriptor). Kibana silently drops it: debug log
 * only, no telemetry stat doc.
 *
 * `invalid_descriptor` — the version is known but the descriptor is malformed
 * (missing required fields, etc.). A warning is logged and a skipped stat doc
 * is sent so the problem is visible in telemetry.
 */
export interface ParseFailureQuery {
  id?: string;
  name?: string;
  _raw: unknown;
  failureReason: 'unknown_version' | 'invalid_descriptor';
}

export type HealthDiagnosticQuery = IndexQuery | ApiQuery | ParseFailureQuery;

/**
 * Result of resolving a v2 query's integration patterns against Fleet.
 */
export interface IntegrationResolution {
  name: string;
  version: string;
  indices: string[];
}

export type ExecutableQuery =
  | { kind: 'executable'; query: IndexQuery }
  | { kind: 'executable'; query: IndexQuery; resolution: IntegrationResolution };

export type ApiExecutableQuery =
  | { kind: 'executable_api'; query: ApiQuery }
  | { kind: 'executable_api'; query: ApiQuery; resolution: IntegrationResolution };

export type SkipReason =
  | 'datastreams_not_matched'
  | 'integration_not_installed'
  | 'parse_failure'
  | 'fleet_unavailable'
  | 'unsupported_query'
  | 'expired';

export interface SkippedQuery {
  kind: 'skipped';
  query: HealthDiagnosticQuery;
  reason: SkipReason;
}

export type ResolvedQuery = ExecutableQuery | ApiExecutableQuery | SkippedQuery;

export interface HealthDiagnosticQueryResult {
  name: string;
  queryId: string;
  traceId: string;
  page: number;
  data: unknown[];
}

export interface HealthDiagnosticQueryStats {
  // existing — unchanged
  name: string;
  started: string;
  finished: string;
  traceId: string;
  numDocs: number;
  /** Kept for downstream backward compatibility. Derived from `status`. */
  passed: boolean;
  failure?: HealthDiagnosticQueryFailure;
  fieldNames: string[];
  circuitBreakers?: Record<string, unknown>;
  // new fields
  descriptorVersion: number;
  status: 'success' | 'failed' | 'skipped';
  skipReason?: SkipReason;
  integration?: IntegrationResolution;
}

export interface HealthDiagnosticQueryFailure {
  message: string;
  reason?: CircuitBreakerResult;
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}
