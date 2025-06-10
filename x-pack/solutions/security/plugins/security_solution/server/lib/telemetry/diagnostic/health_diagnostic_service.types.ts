/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
export type Stats = Record<string, unknown>;
import type { AnalyticsServiceStart, ElasticsearchClient } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ITelemetryReceiver } from '../receiver';
import type { CdnConfig } from '../artifact';

export interface HealthDiagnosticServiceSetup {
  taskManager: TaskManagerSetupContract;
}

export interface HealthDiagnosticServiceStart {
  taskManager: TaskManagerStartContract;
  esClient: ElasticsearchClient;
  analytics: AnalyticsServiceStart;
  receiver: ITelemetryReceiver;
}

export interface HealthDiagnosticQuery {
  name: string;
  esQuery: SearchRequest;
  scheduleInterval: string;
  isEnabled?: boolean;
}

export interface HealthDiagnosticService {
  setup(setup: HealthDiagnosticServiceSetup): void;
  start(start: HealthDiagnosticServiceStart): Promise<void>;
  runHealthDiagnosticQueries(
    lastExecutionByQuery: Record<string, number>
  ): Promise<HealthDiagnosticQueryStats[]>;
  // TODO: remove before merge, for testing purposes
  updateCdnUrl(cdn: CdnConfig): Promise<void>;
}

export interface HealthDiagnosticQuery {
  name: string;
  esQuery: SearchRequest;
  scheduleInterval: string;
  isEnabled?: boolean;
}

export interface HealthDiagnosticQueryResult {
  name: string;
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
