/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ResolutionRuleId } from '../../../../../common/domain/resolution_rules/constants';
import { RESOLUTION_RULE_CONFIGS } from '../../../../maintainers/automated_resolution/rule_config';

// Valid ids are exactly the rules the list endpoint returns. Modeling the path
// param as an enum means an unknown id fails request validation (400) and the
// allowed values are advertised in the generated OpenAPI.
const ruleIds = RESOLUTION_RULE_CONFIGS.map((rule) => rule.id) as [
  ResolutionRuleId,
  ...ResolutionRuleId[]
];

export const ruleParamsSchema = z.object({
  id: z.enum(ruleIds).describe('The resolution rule identifier.'),
});
