/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createLeadIndexService, type LeadIndexService } from './indices';
export { ObservationModuleRegistry, type ObservationEntity } from './observation_modules';
export { createLeadGenerationEngine } from './engine';
export {
  createRiskScoreModule,
  createTemporalStateModule,
  createBehavioralAnalysisModule,
  createAlertAnalysisModule,
} from './observation_modules';
export type {
  Lead,
  LeadEntity,
  LeadGenerationEngineConfig,
  LeadStaleness,
  Observation,
  ObservationModule,
  ObservationModuleConfig,
  ObservationSeverity,
} from './types';
export { DEFAULT_ENGINE_CONFIG } from './types';
