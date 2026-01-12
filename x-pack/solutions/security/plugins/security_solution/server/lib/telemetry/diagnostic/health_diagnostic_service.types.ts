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
import type { CircuitBreakerResult } from './health_diagnostic_circuit_breakers.types';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';

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
}

export interface HealthDiagnosticServiceStart {
  taskManager: TaskManagerStartContract;
  esClient: ElasticsearchClient;
  analytics: AnalyticsServiceStart;
  telemetryConfigProvider: TelemetryConfigProvider;
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
 * Defines a health diagnostic query configuration with scheduling and filtering options.
 */
export interface HealthDiagnosticQuery {
  /**
   * A unique identifier for this query.
   */
  id: string;
  /**
   * A descriptive name for this query.
   */
  name: string;
  /**
   * The index pattern on which this query will be executed.
   */
  index: string;
  /**
   * Only include indices in the specified tiers. Note that if the `index`
   * hasn't a life cycle management or we are on serverless, this will be
   * ignored.
   */
  tiers?: string[];
  /**
   * Specifies the query type, as defined by the QueryType enum.
   */
  type: QueryType;
  /**
   * The query string to be executed against the data store.
   */
  query: string;
  /**
   * A cron expression that schedules when the query should be run.
   */
  scheduleCron: string;
  /**
   * Optional mapping of dot-separated paths to associated actions for filtering results.
   */
  filterlist: Record<string, Action>;
  /**
   * Optional flag indicating whether this query is active and should be executed.
   */
  enabled?: boolean;
  /**
   * Query size
   */
  size?: number;
  /**
   * Optional RSA public key identifier used for encrypting fields marked with `encrypt` action
   * in the filterlist. Required when the filterlist contains any `encrypt` actions.
   * This ID corresponds to keys configured in the plugin-level `encryption_public_keys` map.
   * Example: "rsa-keypair-v1-2025-q4"
   */
  encryptionKeyId?: string;
}

export interface HealthDiagnosticQueryResult {
  name: string;
  queryId: string;
  traceId: string;
  page: number;
  data: unknown[];
}

export interface HealthDiagnosticQueryStats {
  name: string;
  started: string;
  finished: string;
  traceId: string;
  numDocs: number;
  passed: boolean;
  failure?: HealthDiagnosticQueryFailure;
  fieldNames: string[];
  circuitBreakers?: Record<string, unknown>;
}

export interface HealthDiagnosticQueryFailure {
  message: string;
  reason?: CircuitBreakerResult;
}
