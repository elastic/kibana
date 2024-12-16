/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { RiskScoreFields } from '../../../search_strategy';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';
import { riskScoreEntity } from './model/risk_score_entity';
import { EntityRiskQueries } from '../model/factory_query_type';

const baseRiskScoreRequestOptionsSchema = requestBasicOptionsSchema.extend({
  alertsTimerange: timerange.optional(),
  riskScoreEntity,
  includeAlertsCount: z.boolean().optional(),
  onlyLatest: z.boolean().optional(),
  pagination: z
    .object({
      cursorStart: z.number(),
      querySize: z.number(),
    })
    .optional(),
  sort: sort
    .removeDefault()
    .extend({
      field: z.nativeEnum(RiskScoreFields),
    })
    .optional(),
});

export const riskScoreRequestOptionsSchema = baseRiskScoreRequestOptionsSchema.extend({
  factoryQueryType: z.nativeEnum(EntityRiskQueries),
});

export type RiskScoreRequestOptionsInput = z.input<typeof riskScoreRequestOptionsSchema>;

export type RiskScoreRequestOptions = z.infer<typeof riskScoreRequestOptionsSchema>;
