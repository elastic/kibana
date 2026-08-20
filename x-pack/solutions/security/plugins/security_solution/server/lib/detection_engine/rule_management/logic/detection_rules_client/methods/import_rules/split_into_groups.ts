/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';
import type { ImportableRuleData } from './types';

interface SplitInGroupsParams {
  rules: ImportableRuleData[];
  existingRules: Record<string, RuleResponse>;
  overwriteExistingRules: boolean;
}

interface RuleToImportGroups {
  conflicts: ImportableRuleData[];
  toCreate: ImportableRuleData[];
  toOverwrite: ImportableRuleData[];
}

export function splitIntoGroups({
  rules,
  existingRules,
  overwriteExistingRules,
}: SplitInGroupsParams): RuleToImportGroups {
  const result: RuleToImportGroups = {
    conflicts: [],
    toCreate: [],
    toOverwrite: [],
  };

  for (const rule of rules) {
    if (!existingRules[rule.rule.rule_id]) {
      result.toCreate.push(rule);
    } else if (overwriteExistingRules) {
      result.toOverwrite.push(rule);
    } else {
      result.conflicts.push(rule);
    }
  }

  return result;
}
