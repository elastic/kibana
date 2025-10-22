/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigureRiskEngineSavedObjectRequestBody } from '../../../../common/api/entity_analytics';

export const DEFAULT_ENTITY_TYPES = ['host', 'user', 'service'] as const;

export type AlertFilter = NonNullable<ConfigureRiskEngineSavedObjectRequestBody['filters']>[number];

export interface UIAlertFilter {
  id: string;
  text: string;
  entityTypes: AlertFilter['entity_types'];
}

export interface RiskScoreConfiguration {
  includeClosedAlerts: boolean;
  range: {
    start: string;
    end: string;
  };
  enableResetToZero: boolean;
  filters: AlertFilter[];
}
