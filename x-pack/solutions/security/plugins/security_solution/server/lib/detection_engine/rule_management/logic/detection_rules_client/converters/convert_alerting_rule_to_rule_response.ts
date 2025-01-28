/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { stringifyZodError } from '@kbn/zod-helpers';
import { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleParams } from '../../../../rule_schema';
import { internalRuleToAPIResponse } from './internal_rule_to_api_response';
import { RuleResponseValidationError } from '../utils';

export function convertAlertingRuleToRuleResponse(rule: SanitizedRule<RuleParams>): RuleResponse {
  const parseResult = RuleResponse.safeParse(internalRuleToAPIResponse(rule));

  if (!parseResult.success) {
    throw new RuleResponseValidationError({
      message: stringifyZodError(parseResult.error),
      ruleId: rule.params.ruleId,
    });
  }

  return parseResult.data;
}
