/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../common/constants';
import type { BulkEditActionResponse } from '../../../../common/api/detection_engine/rule_management';
import { enableRuleStepCommonDefinition } from '../../../../common/workflows/step_types/enable_rule_step/enable_rule_step_common';

export const enableRuleStepDefinition = createServerStepDefinition({
  ...enableRuleStepCommonDefinition,
  handler: async (context) => {
    const { body } = await context.contextManager.callKibanaApi<BulkEditActionResponse>({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      body: { action: 'enable', ...context.input },
    });

    const { summary } = body.attributes;

    return {
      output: {
        succeeded: summary.succeeded,
        failed: summary.failed,
        skipped: summary.skipped,
        total: summary.total,
      },
    };
  },
});
