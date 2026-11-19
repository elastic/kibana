/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkCreateRulesParams, RulesClient } from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import { PREBUILT_RULES_BULK_CREATE_BATCH_SIZE } from '../../../../prebuilt_rules/constants';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';
import type {
  BulkCreatePrebuiltRulesArgs,
  BulkCreatePrebuiltRulesResult,
} from '../detection_rules_client_interface';

interface BulkCreatePrebuiltRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  args: BulkCreatePrebuiltRulesArgs;
}

export const bulkCreatePrebuiltRules = async ({
  actionsClient,
  rulesClient,
  mlAuthz,
  args: { rules, changeTracking },
}: BulkCreatePrebuiltRulesOptions): Promise<BulkCreatePrebuiltRulesResult> => {
  if (rules.length === 0) {
    return { results: [], errors: [] };
  }

  const {
    bulkInputs,
    itemById,
    errors: buildBulkInputErrors,
  } = await buildBulkInputs({ actionsClient, mlAuthz, rules });

  if (bulkInputs.length === 0) {
    return { results: [], errors: buildBulkInputErrors };
  }

  const results: BulkCreatePrebuiltRulesResult['results'] = [];
  const errors: BulkCreatePrebuiltRulesResult['errors'] = [...buildBulkInputErrors];

  try {
    const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
      rules: bulkInputs,
      batchSize: PREBUILT_RULES_BULK_CREATE_BATCH_SIZE,
      changeTracking,
    });

    // Alerting echoes back the options.id we supplied, so itemById.get() always
    // resolves. The guards below satisfy TypeScript's Map.get() return type.
    successfulIds.forEach((id) => {
      const asset = itemById.get(id);
      if (asset) {
        results.push({ id, rule_id: asset.rule_id, version: asset.version });
      }
    });

    bulkErrors.forEach((err) => {
      const item = itemById.get(err.rule.id);
      if (item) {
        errors.push({
          item,
          error: Object.assign(
            new Error(err.message),
            err.status != null ? { statusCode: err.status } : {}
          ),
        });
      }
    });
  } catch (err) {
    const wrappedError = err instanceof Error ? err : new Error(String(err));
    bulkInputs.forEach(({ options }) => {
      const asset = options?.id ? itemById.get(options.id) : undefined;
      if (asset) {
        errors.push({ item: asset, error: wrappedError });
      }
    });
  }

  return { results, errors };
};

const buildBulkInputs = async ({
  actionsClient,
  mlAuthz,
  rules,
}: {
  actionsClient: ActionsClient;
  mlAuthz: MlAuthz;
  rules: BulkCreatePrebuiltRulesArgs['rules'];
}): Promise<{
  errors: BulkCreatePrebuiltRulesResult['errors'];
  itemById: Map<string, PrebuiltRuleAsset>;
  bulkInputs: BulkCreateRulesParams<RuleParams>['rules'];
}> => {
  const errors: BulkCreatePrebuiltRulesResult['errors'] = [];
  const itemById = new Map<string, PrebuiltRuleAsset>();
  const bulkInputs: BulkCreateRulesParams<RuleParams>['rules'] = [];

  for (const rule of rules) {
    let mlAuthError: Error | undefined;
    try {
      // MlAuthz caches the underlying capability check and short-circuits non-ML
      // types instantly, so calling this per-rule (instead of deduping by type) is cheap.
      await validateMlAuth(mlAuthz, rule.type);
    } catch (e) {
      mlAuthError = e instanceof Error ? e : new Error(String(e));
    }

    if (mlAuthError) {
      errors.push({ item: rule, error: mlAuthError });
    } else if (!(rule.type in ruleTypeMappings)) {
      errors.push({ item: rule, error: new Error(`Unsupported rule type: ${rule.type}`) });
    } else {
      const id = uuidv4();
      try {
        const data = buildPrebuiltRuleAlertingPayload({ rule, actionsClient });
        itemById.set(id, rule);
        bulkInputs.push({ data, options: { id } });
      } catch (e) {
        errors.push({ item: rule, error: e instanceof Error ? e : new Error(String(e)) });
      }
    }
  }

  return { bulkInputs, itemById, errors };
};

const buildPrebuiltRuleAlertingPayload = ({
  rule,
  actionsClient,
}: {
  rule: PrebuiltRuleAsset;
  actionsClient: ActionsClient;
}): BulkCreateRulesParams<RuleParams>['rules'][number]['data'] => {
  const ruleWithDefaults = applyRuleDefaults({ ...rule, immutable: true });

  return {
    ...convertRuleResponseToAlertingRule(ruleWithDefaults, actionsClient),
    alertTypeId: ruleTypeMappings[rule.type as keyof typeof ruleTypeMappings],
    consumer: SERVER_APP_ID,
    enabled: rule.enabled ?? false,
  };
};
