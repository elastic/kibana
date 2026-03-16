/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { runInvestigationPipeline } from './orchestrator';
export type { RunPipelineParams } from './orchestrator';
export { registerPipelineWorkflowSteps } from './workflow_steps';
export { deduplicateAlerts } from './deduplication';
export { extractEntitiesFromAlerts } from './entity_extraction';
export { matchAlertsToCases } from './case_matching';
export { triggerCaseAttackDiscovery } from './case_integration';
export { getIncrementalDelta, markAlertsProcessed } from './incremental';
export type { PipelineConfig, PipelineExecutionResult } from './types';
export { DEFAULT_PIPELINE_CONFIG } from './types';
