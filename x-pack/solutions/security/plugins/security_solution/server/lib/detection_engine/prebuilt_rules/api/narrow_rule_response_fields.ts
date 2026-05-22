/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponseField } from '../../../../../common/api/detection_engine/prebuilt_rules/common/rule_response_field.gen';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

// Identity fields always returned regardless of `fields` subselection.
const REVIEW_RULE_BASELINE_FIELDS: ReadonlySet<RuleResponseField> = new Set([
  'rule_id',
  'id',
  'version',
  'type',
  'name',
  'immutable',
  'rule_source',
]);

export const narrowRuleResponseFields = (
  rule: RuleResponse,
  fields: RuleResponseField[] | undefined
): Partial<RuleResponse> => {
  if (!fields?.length) {
    return rule;
  }
  const allowed = new Set<RuleResponseField>([...fields, ...REVIEW_RULE_BASELINE_FIELDS]);
  return Object.fromEntries(
    Object.entries(rule).filter(([key]) => allowed.has(key as RuleResponseField))
  ) as Partial<RuleResponse>;
};
