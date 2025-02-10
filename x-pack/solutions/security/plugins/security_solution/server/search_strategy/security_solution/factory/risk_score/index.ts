/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityRiskQueries } from '../../../../../common/api/search_strategy';
import type { FactoryQueryTypes } from '../../../../../common/search_strategy';

import type { SecuritySolutionFactory } from '../types';
import { riskScore } from './all';
import { kpiRiskScore } from './kpi';

export const riskScoreFactory: Record<
  EntityRiskQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [EntityRiskQueries.list]: riskScore,
  [EntityRiskQueries.kpi]: kpiRiskScore,
};
