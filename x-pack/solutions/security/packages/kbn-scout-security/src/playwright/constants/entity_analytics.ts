/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type definitions for Entity Analytics API responses.
 * These are extracted from the security_solution plugin to avoid circular dependencies.
 */

export type RiskEngineStatus = 'NOT_INSTALLED' | 'DISABLED' | 'ENABLED';

export type RiskEngineTaskStatusValues =
  | 'idle'
  | 'claiming'
  | 'running'
  | 'failed'
  | 'should_delete'
  | 'unrecognized'
  | 'dead_letter';

export interface RiskEngineTaskStatus {
  status: RiskEngineTaskStatusValues;
  runAt: string;
  startedAt?: string;
}

export interface RiskEngineStatusResponse {
  risk_engine_status: RiskEngineStatus;
  risk_engine_task_status?: RiskEngineTaskStatus;
}

export type StoreStatus = 'not_installed' | 'installing' | 'running' | 'stopped' | 'error';

export type EntityType = 'user' | 'host' | 'service' | 'generic';

export type EngineStatus = 'installing' | 'started' | 'stopped' | 'updating' | 'error';

export interface EngineDescriptor {
  type: EntityType;
  indexPattern: string;
  status: EngineStatus;
  filter?: string;
  fieldHistoryLength: number;
  lookbackPeriod?: string;
  timestampField?: string;
  timeout?: string;
  frequency?: string;
  delay?: string;
  docsPerSecond?: number;
  error?: {
    message: string;
    action: 'init';
  };
}

export type EngineComponentResource =
  | 'entity_engine'
  | 'entity_definition'
  | 'index'
  | 'data_stream'
  | 'component_template'
  | 'index_template'
  | 'ingest_pipeline'
  | 'enrich_policy'
  | 'task'
  | 'transform'
  | 'ilm_policy';

export interface EngineComponentStatus {
  id: string;
  installed: boolean;
  metadata?: {
    pages_processed: number;
    documents_processed: number;
    documents_indexed: number;
    documents_deleted?: number;
    trigger_count: number;
    index_time_in_ms: number;
    index_total: number;
    index_failures: number;
    search_time_in_ms: number;
    search_total: number;
    search_failures: number;
    processing_time_in_ms: number;
    processing_total: number;
    delete_time_in_ms?: number;
    exponential_avg_checkpoint_duration_ms: number;
    exponential_avg_documents_indexed: number;
    exponential_avg_documents_processed: number;
  };
  resource: EngineComponentResource;
  health?: 'green' | 'yellow' | 'red' | 'unavailable' | 'unknown';
  errors?: Array<{
    title?: string;
    message?: string;
  }>;
}

export interface GetEntityStoreStatusResponse {
  status: StoreStatus;
  engines: Array<
    EngineDescriptor & {
      components?: EngineComponentStatus[];
    }
  >;
}
