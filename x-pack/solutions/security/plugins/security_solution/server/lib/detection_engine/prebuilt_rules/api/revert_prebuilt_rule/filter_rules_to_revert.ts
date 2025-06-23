/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine/model/rule_schema/utils';
import {
  BulkRevertSkipReasonEnum,
  type BulkActionReversionSkipResult,
  type RuleResponse,
} from '../../../../../../common/api/detection_engine';

export const filterRulesToRevert = (rules: RuleResponse[]) => {
  const skipped: BulkActionReversionSkipResult[] = [];
  const rulesToRevert = rules.filter((rule) => {
    if (rule.rule_source.type !== 'external') {
      skipped.push({
        id: rule.id,
        skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_PREBUILT,
      });
      return false;
    } else if (isNonCustomizedPrebuiltRule(rule)) {
      skipped.push({
        id: rule.id,
        skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_CUSTOMIZED,
      });
      return false;
    }
    return true;
  });

  return { rulesToRevert, skipped };
};
