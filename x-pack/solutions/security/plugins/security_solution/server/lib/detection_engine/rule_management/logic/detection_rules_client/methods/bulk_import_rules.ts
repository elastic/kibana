/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { findRules } from '../../search/find_rules';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';
import {
  type RuleImportErrorObject,
  createRuleImportErrorObject,
  isRuleImportError,
} from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import type { IRuleSourceImporter } from '../../import/rule_source_importer';
import { importRule as importRuleSingle } from './import_rule';
import { createPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';

const OVERWRITE_FALLBACK_CONCURRENCY = 10;

interface BulkImportRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  args: {
    rules: RuleToImport[];
    overwriteRules: boolean;
    ruleSourceImporter: IRuleSourceImporter;
    allowMissingConnectorSecrets?: boolean;
  };
}

/**
 * KQL escape — `rule_id` is free-form (`RuleSignatureId`), not guaranteed to be
 * a UUID, so backslashes and double quotes need escaping when used as a
 * value in a KQL string.
 */
const escapeKql = (id: string) => id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Bulk-import rules in a single chunk. Performs per-rule pre-checks, a single
 * `findRules` lookup for `rule_id` conflicts, and one `rulesClient.bulkCreateRules`
 * call for new rules (mixed enabled/disabled). Existing rules with `overwriteRules`
 * still fall through to the per-rule `importRule` path under a small concurrency cap.
 */
export const bulkImportRules = async ({
  actionsClient,
  rulesClient,
  savedObjectsClient,
  mlAuthz,
  args,
}: BulkImportRulesOptions): Promise<Array<RuleResponse | RuleImportErrorObject>> => {
  const { rules, overwriteRules, ruleSourceImporter, allowMissingConnectorSecrets } = args;
  if (rules.length === 0) return [];

  const responses: Array<RuleResponse | RuleImportErrorObject> = [];

  const existingLists = await getReferencedExceptionLists({ rules, savedObjectsClient });
  await ruleSourceImporter.setup(rules);

  // Per-rule pre-checks (in-process, isolated try/catch). Output: only rules
  // that pass all checks proceed to classification.
  interface PreparedImport {
    rule: RuleToImport;
    immutable: boolean;
    ruleSource: ReturnType<IRuleSourceImporter['calculateRuleSource']>['ruleSource'];
    exceptionsList: RuleToImport['exceptions_list'];
  }
  const prepared: PreparedImport[] = [];
  const checkedTypes = new Set<string>();
  const mlAuthErrorByType = new Map<string, Error>();

  for (const rule of rules) {
    if (!ruleSourceImporter.isPrebuiltRule(rule)) {
      rule.version = rule.version ?? 1;
    }
    if (!ruleToImportHasVersion(rule)) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          message: i18n.translate(
            'xpack.securitySolution.detectionEngine.rules.cannotImportPrebuiltRuleWithoutVersion',
            {
              defaultMessage:
                'Prebuilt rules must specify a "version" to be imported. [rule_id: {ruleId}]',
              values: { ruleId: rule.rule_id },
            }
          ),
        })
      );
    } else {
      if (!checkedTypes.has(rule.type)) {
        checkedTypes.add(rule.type);
        try {
          await validateMlAuth(mlAuthz, rule.type);
        } catch (e) {
          mlAuthErrorByType.set(rule.type, e instanceof Error ? e : new Error(String(e)));
        }
      }
      const mlError = mlAuthErrorByType.get(rule.type);
      if (mlError) {
        responses.push(
          createRuleImportErrorObject({ ruleId: rule.rule_id, message: mlError.message })
        );
      } else {
        const [exceptionErrors, exceptionsList] = checkRuleExceptionReferences({
          rule,
          existingLists,
        });
        responses.push(...exceptionErrors);

        let ruleSourceResult;
        try {
          ruleSourceResult = ruleSourceImporter.calculateRuleSource(rule);
        } catch (e) {
          responses.push(
            createRuleImportErrorObject({
              ruleId: rule.rule_id,
              message: e instanceof Error ? e.message : String(e),
            })
          );
        }

        if (ruleSourceResult) {
          prepared.push({
            rule,
            immutable: ruleSourceResult.immutable,
            ruleSource: ruleSourceResult.ruleSource,
            exceptionsList,
          });
        }
      }
    }
  }

  if (prepared.length === 0) return responses;

  // Bulk lookup for `rule_id` conflicts: single KQL parenthesized OR-list.
  const ruleIds = prepared.map((p) => p.rule.rule_id);
  const filter = `alert.attributes.params.ruleId: (${ruleIds
    .map((id) => `"${escapeKql(id)}"`)
    .join(' OR ')})`;
  const found = await findRules({
    rulesClient,
    filter,
    page: 1,
    perPage: ruleIds.length,
    fields: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });
  const existingByRuleId = new Map<string, RuleResponse>();
  for (const alertingRule of found.data) {
    const ruleResponse = convertAlertingRuleToRuleResponse(alertingRule);
    existingByRuleId.set(ruleResponse.rule_id, ruleResponse);
  }

  // Classify: conflict | overwrite-fallback | bulk-create.
  const conflicts: PreparedImport[] = [];
  const toOverwrite: PreparedImport[] = [];
  const toBulkCreate: PreparedImport[] = [];
  for (const p of prepared) {
    if (existingByRuleId.has(p.rule.rule_id)) {
      if (overwriteRules) toOverwrite.push(p);
      else conflicts.push(p);
    } else {
      toBulkCreate.push(p);
    }
  }

  conflicts.forEach((p) => {
    responses.push(
      createRuleImportErrorObject({
        ruleId: p.rule.rule_id,
        type: 'conflict',
        message: 'Rule with this rule_id already exists',
      })
    );
  });

  // Overwrite branch: stays per-rule via existing single-rule importRule.
  if (toOverwrite.length > 0) {
    const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const overwriteResults = await pMap(
      toOverwrite,
      async (p) => {
        try {
          const updated = await importRuleSingle({
            actionsClient,
            rulesClient,
            mlAuthz,
            prebuiltRuleAssetClient,
            importRulePayload: {
              ruleToImport: { ...p.rule, exceptions_list: [...(p.exceptionsList ?? [])] },
              overrideFields: { rule_source: p.ruleSource, immutable: p.immutable },
              overwriteRules: true,
              allowMissingConnectorSecrets,
            },
          });
          return updated as RuleResponse | RuleImportErrorObject;
        } catch (err) {
          if (isRuleImportError(err)) return err;
          return createRuleImportErrorObject({
            ruleId: p.rule.rule_id,
            message: err?.message ?? 'unknown error',
          });
        }
      },
      { concurrency: OVERWRITE_FALLBACK_CONCURRENCY }
    );
    responses.push(...overwriteResults);
  }

  if (toBulkCreate.length === 0) return responses;

  // Bulk-create new rules in a single alerting call. Pre-assign uuids so we
  // can re-pair successes/failures back to the source `rule_id`.
  const inputById = new Map<string, PreparedImport>();
  const bulkInputs = toBulkCreate.map((p) => {
    const id = uuidv4();
    inputById.set(id, p);
    const ruleResponse = applyRuleDefaults({
      ...p.rule,
      exceptions_list: [...(p.exceptionsList ?? [])],
      immutable: p.immutable,
      rule_source: p.ruleSource,
    });
    const data = {
      ...convertRuleResponseToAlertingRule(ruleResponse, actionsClient),
      alertTypeId: ruleTypeMappings[p.rule.type],
      consumer: SERVER_APP_ID,
      // Preserve the user-requested enabled flag — alerting handles enabled
      // rules natively (API key + task scheduling) in this single call.
      enabled: p.rule.enabled ?? false,
    };
    return { data, options: { id }, allowMissingConnectorSecrets };
  });

  const bulkResult = await rulesClient.bulkCreateRules<RuleParams>({ rules: bulkInputs });

  bulkResult.rules.forEach((createdRule) => {
    responses.push(convertAlertingRuleToRuleResponse(createdRule));
  });

  bulkResult.errors.forEach((err) => {
    const source = inputById.get(err.rule.id);
    if (!source) return;
    responses.push(
      createRuleImportErrorObject({
        ruleId: source.rule.rule_id,
        message: err.message,
      })
    );
  });

  return responses;
};

export { escapeKql as __testing_escapeKql };
