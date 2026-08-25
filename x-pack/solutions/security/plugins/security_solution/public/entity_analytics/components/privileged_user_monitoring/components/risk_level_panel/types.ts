/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskSeverity } from '../../../../../../common/search_strategy';

export interface RiskLevelsPrivilegedUsersQueryResult extends Record<string, string | number> {
  level: RiskSeverity;
  count: number;
}

export interface RiskLevelsTableItem extends RiskLevelsPrivilegedUsersQueryResult {
  percentage: number;
  total: number;
}
