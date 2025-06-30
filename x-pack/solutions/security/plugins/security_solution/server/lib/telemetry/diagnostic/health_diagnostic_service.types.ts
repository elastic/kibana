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
}

export interface HealthDiagnosticService {
  setup(setup: HealthDiagnosticServiceSetup): void;
  start(start: HealthDiagnosticServiceStart): Promise<void>;
  runHealthDiagnosticQueries(
    lastExecutionByQuery: Record<string, number>
  ): Promise<HealthDiagnosticQueryStats[]>;
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
  filterlist?: Record<string, Action>;
  /**
   * Optional flag indicating whether this query is active and should be executed.
   */
  enabled?: boolean;
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
  failure?: string;
  circuitBreakers?: Record<string, unknown>;
}
