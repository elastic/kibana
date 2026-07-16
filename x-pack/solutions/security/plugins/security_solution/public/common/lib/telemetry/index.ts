/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { telemetryMiddleware } from './middleware';

// Stub: re-exporting AttackDiscoveryEventTypes here lets PR3 consumers
// (e.g. `useAttackDiscovery`) reference the enum before the full telemetry
// wiring lands (PR5). FF-off safe — it's a pure enum.
export { AttackDiscoveryEventTypes } from './events/attack_discovery/types';
export type {
  AttackDiscoveryPipelineStepType,
  AttackDiscoveryScheduleSource,
  AttackDiscoverySettingsTab,
} from './events/attack_discovery/types';

export * from './constants';
export * from './telemetry_service';
export * from './track';
export * from './types';
