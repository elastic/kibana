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
 * Narrow base shared by all query descriptor versions (no type/query/size/tiers).
 */
export interface HealthDiagnosticQueryCommonBase {
  id: string;
  name: string;
  scheduleCron: string;
  filterlist: Record<string, Action>;
  enabled: boolean;
  encryptionKeyId?: string;
}

/**
 * Fields shared across all known query descriptor versions.
 */
export interface HealthDiagnosticQueryBase extends HealthDiagnosticQueryCommonBase {
  type: QueryType;
  query: string;
  size?: number;
  tiers?: string[];
}

/**
 * v1 query descriptor — targets a fixed index pattern.
 * Produced when the descriptor has `version: 1` or no version field.
 */
export interface HealthDiagnosticQueryV1 extends HealthDiagnosticQueryBase {
  version: 1;
  index: string;
}

/**
 * v2 query descriptor: targets integrations matched by regex patterns,
 * or a direct index pattern (mutually exclusive with integrations).
 * Invariant enforced by parser: exactly one of integrations or index is present.
 */
export interface HealthDiagnosticQueryV2 extends HealthDiagnosticQueryBase {
  version: 2;
  integrations?: string[]; // regex patterns resolved via Fleet
  datastreamTypes?: string[]; // only relevant when integrations is set
  index?: string; // alternative to integrations: direct index pattern
}

/**
 * Produced when the parser fails to produce a valid V1 or V2 descriptor —
 * either an unrecognised version number or missing required fields.
 * Carries the raw data for logging and reporting the stats; always results in
 * a skipped execution.
 */
export interface ParseFailureQuery {
  id?: string;
  name?: string;
  _raw: unknown;
}

/**
 * v3 query descriptor — targets a Kibana/ES HTTP API endpoint directly.
 */
export interface HealthDiagnosticQueryV3 extends HealthDiagnosticQueryCommonBase {
  version: 3;
  type: 'API';
  api: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string | number>;
  responsePath?: string;
  responsePathKey?: string;
  integrations?: string[];
}

export type HealthDiagnosticQuery =
  | HealthDiagnosticQueryV1
  | HealthDiagnosticQueryV2
  | HealthDiagnosticQueryV3
  | ParseFailureQuery;

/**
 * Result of resolving a v2 query's integration patterns against Fleet.
 */
export interface IntegrationResolution {
  name: string;
  version: string;
  indices: string[];
}

/**
 * A query that has been resolved and is ready for ES execution.
 * Version-specific shape is preserved for stats reporting.
 */
export type ExecutableQuery =
  | { kind: 'executable'; query: HealthDiagnosticQueryV1 }
  | { kind: 'executable'; query: HealthDiagnosticQueryV2; resolution: IntegrationResolution }
  | { kind: 'executable'; query: HealthDiagnosticQueryV2 & { index: string } };

export type SkipReason =
  | 'datastreams_not_matched'
  | 'integration_not_installed'
  | 'parse_failure'
  | 'fleet_unavailable'
  | 'unsupported_query';

export interface SkippedQuery {
  kind: 'skipped';
  query: HealthDiagnosticQuery;
  reason: SkipReason;
}

/**
 * A resolved API query ready for HTTP execution.
 */
export type ApiExecutableQuery =
  | { kind: 'executable_api'; query: HealthDiagnosticQueryV3 }
  | { kind: 'executable_api'; query: HealthDiagnosticQueryV3; resolution: IntegrationResolution };

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
