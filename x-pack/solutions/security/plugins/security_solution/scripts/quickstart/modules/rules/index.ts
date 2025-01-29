/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import type { RuleCreateProps } from '../../../../common/api/detection_engine';

export const duplicateRuleParams = (
  rule: RuleCreateProps,
  numCopies: number
): RuleCreateProps[] => {
  return range(numCopies).map((idx) => ({ ...rule, name: `${rule.name}_${idx}` }));
};

export const getBasicRuleMetadata = () => ({
  name: 'Test rule',
  description: 'Test rule',
  severity: 'low' as const,
  risk_score: 21,
});
