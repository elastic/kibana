/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSanitizedRule, SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RequiredOptional } from '@kbn/zod-helpers';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleParams } from '../../../../rule_schema';
import { normalizeCommonRuleFields } from './normalize_rule_fields_common';
import { typeSpecificCamelToSnake } from './type_specific_camel_to_snake';

export const internalRuleToAPIResponse = (
  rule: SanitizedRule<RuleParams> | ResolvedSanitizedRule<RuleParams>
): RequiredOptional<RuleResponse> => {
  const normalizedCommonFields = normalizeCommonRuleFields(rule);
  const normalizedTypeSpecificFields = typeSpecificCamelToSnake(rule.params);

  return {
    ...normalizedCommonFields,
    ...normalizedTypeSpecificFields,
  };
};
