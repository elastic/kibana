/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { CREATE_RULE_EXCEPTIONS_URL } from '../../../../common/api/detection_engine/rule_exceptions';
import type { CreateRuleExceptionsResponse } from '../../../../common/api/detection_engine/rule_exceptions';
import { createRuleExceptionStepCommonDefinition } from '../../../../common/workflows/step_types/create_rule_exception_step/create_rule_exception_step_common';
import { toCreateExceptionItemBody, toExceptionItemOutput } from '../../utils/exception_item';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

export const createRuleExceptionStepDefinition = createServerStepDefinition({
  ...createRuleExceptionStepCommonDefinition,
  handler: async (context) => {
    const { rule_id: ruleId, ...item } = context.input;

    try {
      const { body } = await context.contextManager.callKibanaApi<CreateRuleExceptionsResponse>({
        method: 'POST',
        path: CREATE_RULE_EXCEPTIONS_URL.replace('{id}', encodeURIComponent(ruleId)),
        body: { items: [toCreateExceptionItemBody(item)] },
      });

      // The API creates one item per submitted item; we always submit exactly one.
      return toExceptionItemOutput(body?.[0], 'create rule exception');
    } catch (error) {
      throw toApiExecutionError(error, 'create rule exception');
    }
  },
});
