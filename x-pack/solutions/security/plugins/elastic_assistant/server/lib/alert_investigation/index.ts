/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { registerPipelineWorkflowSteps } from './workflow_steps';
export { deduplicateAlerts } from './deduplication';
export { extractEntitiesFromAlerts } from './entity_extraction';
export { matchAlertsToCases } from './case_matching';
export { triggerCaseAttackDiscovery } from './case_integration';
export { getIncrementalDelta, markAlertsProcessed } from './incremental';
export { EnrichmentRegistry } from './enrichment';
export type { EnrichmentStrategy, EnrichedEntity, EnrichmentResult } from './enrichment';
// Enrichment strategies removed - were exploratory, not used in spike
export type {
  PipelineConfig,
  PipelineExecutionResult,
  ProcessedAlertTracker,
  ExtractedEntity,
  CaseMatchScore,
  ObservableTypeKey,
} from './types';
export { DEFAULT_PIPELINE_CONFIG } from './types';
