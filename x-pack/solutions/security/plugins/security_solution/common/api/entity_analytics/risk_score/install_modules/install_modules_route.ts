/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { EntityType } from '../../../../search_strategy';

export const onboardingRiskScoreRequestBody = {
  body: schema.object({
    riskScoreEntity: schema.oneOf([
      schema.literal(EntityType.host),
      schema.literal(EntityType.user),
    ]),
  }),
};
