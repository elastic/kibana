/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkCreateRulesItem, RulesClient } from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import type {
  RuleCreateProps,
  RuleResponse,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';

export interface BulkCreateRuleItem<TSource = unknown> {
  rule: RuleCreateProps & { immutable: boolean };
  allowMissingConnectorSecrets?: boolean;
  /**
   * Caller-provided value preserved verbatim and returned alongside the
   * resulting `RuleResponse` (or per-rule error). Lets wrappers like
   * `bulkCreatePrebuiltRules` re-pair outputs with their original input
   * payload (e.g. a `PrebuiltRuleAsset`) without having to re-key by
   * `rule_id` afterwards.
   */
  source: TSource;
}

export interface BulkCreateRulesResult<TSource = unknown> {
  results: Array<{ item: TSource; result: RuleResponse }>;
  errors: Array<{ item: TSource; error: Error & { statusCode?: number } }>;
}

interface BulkCreateRulesOptions<TSource> {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  rules: Array<BulkCreateRuleItem<TSource>>;
}

/**
 * Bulk-creates detection rules through a single alerting `bulkCreateRules`
 * round-trip instead of issuing one Elasticsearch write per rule.
 *
 * Per-rule failures (ML auth, alerting validation, SO row errors) are
 * isolated and returned via `errors` so callers can keep the partial
 * successes from `results`.
 *
 * Note: the alerting bulk create method only accepts disabled rules. Callers
 * should follow up with `bulkEnableRules` if rules need to be enabled.
 */
export const bulkCreateRules = async <TSource>({
  actionsClient,
  rulesClient,
  mlAuthz,
  rules: items,
}: BulkCreateRulesOptions<TSource>): Promise<BulkCreateRulesResult<TSource>> => {
  const results: BulkCreateRulesResult<TSource>['results'] = [];
  const errors: BulkCreateRulesResult<TSource>['errors'] = [];

  if (items.length === 0) {
    return { results, errors };
  }

  // Pre-assign a SO id per input so we can map alerting's per-rule
  // results/errors (keyed by rule.id) back to the original input source.
  const idToSource = new Map<string, TSource>();
  const bulkInputs: Array<BulkCreateRulesItem<RuleParams>> = [];

  for (const item of items) {
    try {
      await validateMlAuth(mlAuthz, item.rule.type);

      const ruleWithDefaults = applyRuleDefaults(item.rule);
      const id = uuidv4();
      idToSource.set(id, item.source);

      bulkInputs.push({
        data: {
          ...convertRuleResponseToAlertingRule(ruleWithDefaults, actionsClient),
          alertTypeId: ruleTypeMappings[item.rule.type],
          consumer: SERVER_APP_ID,
          // The alerting bulk create rejects enabled rules; force-disable here
          // so the wrapper has a consistent contract with the underlying method.
          enabled: false,
        },
        options: { id },
        allowMissingConnectorSecrets: item.allowMissingConnectorSecrets,
      });
    } catch (error) {
      errors.push({ item: item.source, error: toError(error) });
    }
  }

  if (bulkInputs.length === 0) {
    return { results, errors };
  }

  const bulkResult = await rulesClient.bulkCreateRules<RuleParams>({
    rules: bulkInputs,
  });

  for (const rule of bulkResult.rules) {
    if (idToSource.has(rule.id)) {
      const item = idToSource.get(rule.id) as TSource;
      try {
        results.push({ item, result: convertAlertingRuleToRuleResponse(rule) });
      } catch (error) {
        errors.push({ item, error: toError(error) });
      }
    }
  }

  for (const failure of bulkResult.errors) {
    if (idToSource.has(failure.rule.id)) {
      const item = idToSource.get(failure.rule.id) as TSource;
      const error = Object.assign(new Error(failure.message ?? 'Failed to create rule'), {
        statusCode: failure.status,
      });
      errors.push({ item, error });
    }
  }

  return { results, errors };
};

const toError = (err: unknown): Error & { statusCode?: number } => {
  if (err instanceof Error) {
    return err;
  }
  return new Error(typeof err === 'string' ? err : JSON.stringify(err));
};
