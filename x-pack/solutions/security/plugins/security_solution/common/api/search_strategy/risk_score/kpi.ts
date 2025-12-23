/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { riskScoreEntity, riskScoreEntityArray } from './model/risk_score_entity';
import { EntityRiskQueries } from '../model/factory_query_type';

export const riskScoreKpiRequestOptionsSchema = requestBasicOptionsSchema.extend({
  entity: z.union([riskScoreEntity, riskScoreEntityArray]),
  factoryQueryType: z.literal(EntityRiskQueries.kpi),
});

export type RiskScoreKpiRequestOptionsInput = z.input<typeof riskScoreKpiRequestOptionsSchema>;

export type RiskScoreKpiRequestOptions = z.infer<typeof riskScoreKpiRequestOptionsSchema>;
