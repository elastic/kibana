/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { updateRuleOutputSchema } from '../../../../common/workflows/step_types/update_rule_step/update_rule_step_common';
import { updateRuleStepCommonDefinition } from '../../../../common/workflows/step_types/update_rule_step/update_rule_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

type UpdateRuleOutput = z.infer<typeof updateRuleOutputSchema>;

export const updateRuleStepDefinition = createServerStepDefinition({
  ...updateRuleStepCommonDefinition,
  handler: async (context) => {
    try {
      // The PATCH endpoint owns all validation: exactly one of `id`/`rule_id`, and the body
      // is validated against the existing rule's type (`type` is optional and cannot change
      // the rule type).
      const { body } = await context.contextManager.callKibanaApi<UpdateRuleOutput>({
        method: 'PATCH',
        path: DETECTION_ENGINE_RULES_URL,
        body: context.input.rule,
      });
      return { output: body };
    } catch (error) {
      throw toApiExecutionError(error, 'update detection rule');
    }
  },
});
