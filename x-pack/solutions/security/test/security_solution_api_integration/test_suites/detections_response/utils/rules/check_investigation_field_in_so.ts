/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { SavedObjectReference } from '@kbn/core/server';
import { InvestigationFields } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { isEqual } from 'lodash/fp';
import { getRuleSOById } from './get_rule_so_by_id';

interface RuleSO {
  alert: Rule<BaseRuleParams>;
  references: SavedObjectReference[];
}

export const checkInvestigationFieldSoValue = async (
  ruleSO: RuleSO | undefined,
  expectedSoValue: undefined | InvestigationFields,
  es?: Client,
  ruleId?: string
): Promise<boolean> => {
  if (!ruleSO && es && ruleId) {
    const {
      hits: {
        hits: [{ _source: rule }],
      },
    } = await getRuleSOById(es, ruleId);

    return isEqual(rule?.alert.params.investigationFields, expectedSoValue);
  }

  return isEqual(ruleSO?.alert.params.investigationFields, expectedSoValue);
};
