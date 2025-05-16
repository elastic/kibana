/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { findRules } from '../../search/find_rules';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';

interface GetRuleByRuleIdOptions {
  rulesClient: RulesClient;
  ruleId: RuleSignatureId;
}

export const getRuleByRuleId = async ({
  rulesClient,
  ruleId,
}: GetRuleByRuleIdOptions): Promise<RuleResponse | null> => {
  const findRuleResponse = await findRules({
    rulesClient,
    filter: `alert.attributes.params.ruleId: "${ruleId}"`,
    page: 1,
    fields: undefined,
    perPage: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });
  if (findRuleResponse.data.length === 0) {
    return null;
  }
  return convertAlertingRuleToRuleResponse(findRuleResponse.data[0]);
};
