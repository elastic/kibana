/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { PREBUILT_REVIEW_RULE_RESPONSE_FIELD_ALLOWLIST } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_review_shared';

export const pickRuleResponseFields = (
  rule: RuleResponse,
  fields: string[] | undefined
): RuleResponse => {
  if (fields == null || fields.length === 0) {
    return rule;
  }
  const allowed = fields.filter((f) => PREBUILT_REVIEW_RULE_RESPONSE_FIELD_ALLOWLIST.has(f));
  if (allowed.length === 0) {
    return rule;
  }
  return pick(rule, allowed) as RuleResponse;
};
