/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ObservationModule,
  ObservationModuleConfig,
  ObservationEntity,
  AlertBucket,
} from './types';
export { parseAlertBuckets } from './types';
export { ObservationModuleRegistry } from './observation_module_registry';
export { createRiskScoreModule } from './risk_score_module';
export { createTemporalStateModule } from './temporal_state_module';
export { createBehavioralAnalysisModule } from './behavioral_analysis_module';
export { createEntityProfileModule } from './entity_profile_module';
export { createAnomalyDetectionModule } from './anomaly_detection_module';
export { registerObservationModules, type ObservationModuleDeps } from './register_modules';
export { OBSERVATION_MODULE_WEIGHTS } from './weights';
export {
  extractIsPrivileged,
  groupEntitiesByType,
  makeObservation,
  matchesPrivilegedWatchlist,
} from './utils';
