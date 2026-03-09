/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ObservationModule, ObservationModuleConfig, ObservationEntity } from './types';
export { ObservationModuleRegistry } from './observation_module_registry';
export { createRiskScoreModule } from './risk_score_module';
export { createTemporalStateModule } from './temporal_state_module';
export { createBehavioralAnalysisModule, createAlertAnalysisModule } from './alert_analysis_module';
export { entityToKey, extractIsPrivileged, groupEntitiesByType, makeObservation } from './utils';
