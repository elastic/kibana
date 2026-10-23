/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { createRuleOutputSchema } from '../../../../common/workflows/step_types/create_rule_step/create_rule_step_common';
import { createRuleStepCommonDefinition } from '../../../../common/workflows/step_types/create_rule_step/create_rule_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

type CreateRuleOutput = z.infer<typeof createRuleOutputSchema>;

export const createRuleStepDefinition = createServerStepDefinition({
  ...createRuleStepCommonDefinition,
  handler: async (context) => {
    try {
      const { rule } = context.input;
      const { body } = await context.contextManager.callKibanaApi<CreateRuleOutput>({
        method: 'POST',
        path: DETECTION_ENGINE_RULES_URL,
        // Always create the rule disabled, overriding any "enabled" in the input.
        body: { ...rule, enabled: false },
      });
      return { output: body };
    } catch (error) {
      throw toApiExecutionError(error, 'create detection rule');
    }
  },
});
