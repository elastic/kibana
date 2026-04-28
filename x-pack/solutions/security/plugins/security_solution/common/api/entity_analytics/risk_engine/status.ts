/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RiskEngineStatus = 'NOT_INSTALLED' | 'DISABLED' | 'ENABLED';

export const RiskEngineStatusEnum = {
  NOT_INSTALLED: 'NOT_INSTALLED',
  DISABLED: 'DISABLED',
  ENABLED: 'ENABLED',
} as const;

export type RiskEngineTaskStatusValues = 'idle' | 'running';

export interface RiskEngineTaskStatus {
  status: RiskEngineTaskStatusValues;
  runAt: string;
}

export interface RiskEngineStatusResponse {
  risk_engine_status: RiskEngineStatus;
  risk_engine_task_status?: RiskEngineTaskStatus;
}

export interface ReadRiskEngineSettingsResponse {
  range?: { start: string; end: string };
  includeClosedAlerts?: boolean;
  enableResetToZero?: boolean;
  filters?: Array<{
    entity_types: Array<'host' | 'user' | 'service'>;
    filter: string;
  }>;
}
