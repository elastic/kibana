/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RiskScoreDistribution {
  critical?: number;
  high?: number;
  moderate?: number;
  low?: number;
  unknown?: number;
  normP50?: number;
  normP90?: number;
}
