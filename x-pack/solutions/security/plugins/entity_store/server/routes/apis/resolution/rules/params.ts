/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { RESOLUTION_RULE_IDS } from '../../../../../common';

export const ruleIdParamsSchema = z.object({
  id: z
    .enum([RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH, RESOLUTION_RULE_IDS.RELATED_USER_BRIDGE])
    .describe('The stable identifier of the entity resolution rule.'),
});
