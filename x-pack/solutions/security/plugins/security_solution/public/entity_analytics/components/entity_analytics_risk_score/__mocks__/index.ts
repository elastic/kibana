/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskSeverity } from '../../../../../common/search_strategy/security_solution';

export const mockSeverityCount = {
  [RiskSeverity.Unknown]: 1,
  [RiskSeverity.Low]: 2,
  [RiskSeverity.Moderate]: 3,
  [RiskSeverity.High]: 4,
  [RiskSeverity.Critical]: 5,
};
