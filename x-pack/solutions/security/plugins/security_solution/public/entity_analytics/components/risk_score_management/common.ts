/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReadRiskEngineSettingsResponse } from '../../../../common/api/entity_analytics';

export const DEFAULT_ENTITY_TYPES = ['host', 'user', 'service'] as const;

type BaseRiskEngineSettings = ReadRiskEngineSettingsResponse;

export type AlertFilter = NonNullable<BaseRiskEngineSettings['filters']>[number];

export interface UIAlertFilter {
  id: string;
  text: string;
  entityTypes: AlertFilter['entity_types'];
}

export interface RiskScoreConfiguration extends BaseRiskEngineSettings {
  includeClosedAlerts: boolean;
  range: {
    start: string;
    end: string;
  };
  enableResetToZero: boolean;
  filters: AlertFilter[];
}

export const getRiskScoreConfigurationWithDefaults = (
  riskEngineSettings?: Partial<RiskScoreConfiguration>
): RiskScoreConfiguration => ({
  ...riskEngineSettings,
  includeClosedAlerts: riskEngineSettings?.includeClosedAlerts ?? false,
  range: {
    start: riskEngineSettings?.range?.start ?? 'now-30d',
    end: riskEngineSettings?.range?.end ?? 'now',
  },
  enableResetToZero:
    riskEngineSettings?.enableResetToZero === undefined
      ? true
      : riskEngineSettings.enableResetToZero,
  filters: Array.isArray(riskEngineSettings?.filters) ? riskEngineSettings.filters : [],
});
