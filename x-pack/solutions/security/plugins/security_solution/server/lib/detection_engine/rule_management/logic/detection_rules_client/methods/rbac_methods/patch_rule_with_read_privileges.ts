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
import type { ReadAuthRulePatchProps } from '../../../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../../../rule_schema';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { applyRulePatch } from '../../mergers/apply_rule_patch';
import { getReadAuthFieldValue } from '../../utils';

/**
 * Applies the `bulkEditRuleParamsWithReadAuth` function to patch rule field values
 *
 * Will throw errors if patch request contains fields not defined as a `ValidReadAuthEditFields` in the alerting plugin
 */
export const patchReadAuthEditRuleFields = async ({
  rulesClient,
  rulePatch,
  existingRule,
  prebuiltRuleAssetClient,
}: {
  rulesClient: RulesClient;
  rulePatch: ReadAuthRulePatchProps;
  existingRule: RuleResponse;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
}): Promise<BulkEditResult<RuleParams>> => {
  const { rule_source } = await applyRulePatch({
    prebuiltRuleAssetClient,
    existingRule,
    rulePatch,
  });

  const nextRule = { ...rulePatch, rule_source };

  const operations = Object.keys(nextRule).map((field) => {
    const camelCasedField = camelCase(field) as ValidReadAuthEditFields; // RuleParams schema is camel cased
    return {
      field: camelCasedField,
      operation: 'set' as const,
      value: getReadAuthFieldValue(field, nextRule),
    };
  });

  return rulesClient.bulkEditRuleParamsWithReadAuth<RuleParams>({
    ids: [existingRule.id],
    operations,
  });
};
