/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The step of an integration run that threw, used to attribute an 'error' outcome. */
export type IntegrationStage = 'fetch-actors' | 'fetch-targets' | 'entity-write' | 'metadata-write';

export interface RelationshipMaintainerSourceResult {
  /** Integration id from RelationshipIntegrationConfig.id (e.g. 'elastic_defend'). */
  id: string;
  /** Composite-agg buckets observed (actors discovered) for this integration. */
  scanned: number;
  /** Records produced from ES|QL parse for this integration. */
  qualified: number;
  /** Terminal state for this integration's run. */
  outcome: 'index_missing' | 'empty' | 'partial' | 'producing' | 'error';
  /** Entity writes that landed in the store for this integration. */
  applied: number;
  /** Which step threw. Present only when `outcome` is 'error'. */
  failedStage?: IntegrationStage;
}

/**
 * Optional mutable collector passed by callers that want full-fidelity telemetry.
 * Engine populates `sources` once per integration and accumulates `relationshipTypeApplied`
 * across integrations. Callers read it after `runRelationshipMaintainer` returns.
 */
export interface RelationshipMaintainerTelemetryCollector {
  sources: RelationshipMaintainerSourceResult[];
  relationshipTypeApplied: Record<string, number>;
}
