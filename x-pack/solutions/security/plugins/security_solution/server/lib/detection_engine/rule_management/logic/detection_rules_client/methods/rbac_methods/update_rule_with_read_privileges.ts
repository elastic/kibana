/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import { camelCase } from 'lodash';
import type { BulkEditResult } from '@kbn/alerting-plugin/server/rules_client/common/bulk_edit/types';
import type { ValidReadAuthEditFields } from '@kbn/alerting-plugin/common/constants';
import type { DetectionRulesAuthz } from '../../../../../../../../common/detection_engine/rule_management/authz';
import type { ReadAuthRuleUpdateWithRuleSource } from '../../../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../../../rule_schema';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { getReadAuthFieldValue, validateFieldWritePermissions } from '../../utils';

/**
 * Applies the `bulkEditRuleParamsWithReadAuth` function to update rule field values
 *
 * Will throw errors if patch request contains fields not defined as a `ValidReadAuthEditFields` in the alerting plugin
 */
export const updateReadAuthEditRuleFields = async ({
  rulesClient,
  ruleUpdate,
  existingRule,
  rulesAuthz,
}: {
  rulesClient: RulesClient;
  ruleUpdate: ReadAuthRuleUpdateWithRuleSource;
  existingRule: RuleResponse;
  rulesAuthz: DetectionRulesAuthz;
}): Promise<BulkEditResult<RuleParams>> => {
  validateFieldWritePermissions(ruleUpdate, rulesAuthz);

  const operations = Object.keys(ruleUpdate).map((field) => {
    const camelCasedField = camelCase(field) as ValidReadAuthEditFields; // RuleParams schema is camel cased
    return {
      field: camelCasedField,
      operation: 'set' as const,
      value: getReadAuthFieldValue(field, ruleUpdate),
    };
  });

  return rulesClient.bulkEditRuleParamsWithReadAuth<RuleParams>({
    ids: [existingRule.id],
    operations,
  });
};
