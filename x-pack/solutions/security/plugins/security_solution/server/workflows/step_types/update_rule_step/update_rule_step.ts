/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { z } from '@kbn/zod/v4';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { updateRuleOutputSchema } from '../../../../common/workflows/step_types/update_rule_step/update_rule_step_common';
import { updateRuleStepCommonDefinition } from '../../../../common/workflows/step_types/update_rule_step/update_rule_step_common';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

type UpdateRuleOutput = z.infer<typeof updateRuleOutputSchema>;

export const updateRuleStepDefinition = createServerStepDefinition({
  ...updateRuleStepCommonDefinition,
  handler: async (context) => {
    // Inputs passed as a single expression (`rule: "${{ ... }}"`) bypass input schema
    // validation entirely, so the selector and the `type` discriminator are re-checked here.
    const { rule } = context.input;
    const { id, rule_id: ruleId } = rule;
    if ((id === undefined) === (ruleId === undefined)) {
      throw new ExecutionError({
        type: 'ValidationError',
        message: 'Provide exactly one of "id" or "rule_id" to identify the rule to update.',
      });
    }

    let existingRule: UpdateRuleOutput;
    try {
      ({ body: existingRule } = await context.contextManager.callKibanaApi<UpdateRuleOutput>({
        method: 'GET',
        path: DETECTION_ENGINE_RULES_URL,
        query: id !== undefined ? { id } : { rule_id: ruleId },
      }));
    } catch (error) {
      throw toApiExecutionError(error, 'read detection rule before update');
    }

    if (rule.type !== undefined && rule.type !== existingRule.type) {
      throw new ExecutionError({
        type: 'ValidationError',
        message: `The rule has type "${existingRule.type}", but the step received type "${rule.type}". A rule's type cannot be changed.`,
      });
    }

    try {
      // Always sending the existing rule's `type` makes the PATCH endpoint validate the body
      // against the matching rule-type schema; a typeless body is validated against the first
      // schema in the endpoint's union (EQL), which silently drops type-specific fields.
      const { body } = await context.contextManager.callKibanaApi<UpdateRuleOutput>({
        method: 'PATCH',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...rule, type: existingRule.type },
      });
      return { output: body };
    } catch (error) {
      throw toApiExecutionError(error, 'update detection rule');
    }
  },
});
