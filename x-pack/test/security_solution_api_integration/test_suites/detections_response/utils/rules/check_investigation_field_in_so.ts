/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { InvestigationFields } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getRuleSOById } from './get_rule_so_by_id';

export const checkInvestigationFieldSoValue = async (
  ruleSO: RuleSO | undefined,
  expectedSoValue: undefined | InvestigationFields,
  es?: Client,
  ruleId?: string
) => {
  if (!ruleSO && es && ruleId) {
    const {
      hits: {
        hits: [{ _source: rule }],
      },
    } = await getRuleSOById(es, ruleId);

    return rule?.alert.params.investigationFields === expectedSoValue;
  }

  return ruleSO?.alert.params.investigationFields === expectedSoValue;
};
