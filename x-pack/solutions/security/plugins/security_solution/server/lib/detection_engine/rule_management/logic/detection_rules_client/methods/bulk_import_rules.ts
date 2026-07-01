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
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
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
import { RULE_MANAGEMENT_IMPORT_BATCH_SIZE } from '../../../api/constants';

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

export interface BulkImportRuleSuccess {
  rule_id: string;
}

export interface BulkImportRulesResult {
  responses: Array<BulkImportRuleSuccess | RuleImportErrorObject>;
}

// Survivors of per-rule prep that proceed to conflict classification.
interface PreparedImport {
  rule: RuleToImport;
  immutable: boolean;
  ruleSource: ReturnType<IRuleSourceImporter['calculateRuleSource']>['ruleSource'];
  exceptionsList: RuleToImport['exceptions_list'];
}

const missingVersionError = (ruleId: string): RuleImportErrorObject =>
  createRuleImportErrorObject({
    ruleId,
    message: i18n.translate(
      'xpack.securitySolution.detectionEngine.rules.cannotImportPrebuiltRuleWithoutVersion',
      {
        defaultMessage:
          'Prebuilt rules must specify a "version" to be imported. [rule_id: {ruleId}]',
        values: { ruleId },
      }
    ),
  });

export const bulkImportRules = async ({
  actionsClient,
  rulesClient,
  savedObjectsClient,
  mlAuthz,
  args,
}: BulkImportRulesOptions): Promise<BulkImportRulesResult> => {
  const { rules, overwriteRules, ruleSourceImporter, allowMissingConnectorSecrets } = args;
  if (rules.length === 0) return { responses: [] };

  const responses: Array<BulkImportRuleSuccess | RuleImportErrorObject> = [];

  const existingLists = await getReferencedExceptionLists({ rules, savedObjectsClient });
  await ruleSourceImporter.setup(rules);

  // Per-rule prep: validate in-process, collect errors, pass survivors on to classification.
  const prepared: PreparedImport[] = [];
  for (const rule of rules) {
    if (!ruleSourceImporter.isPrebuiltRule(rule)) {
      rule.version = rule.version ?? 1;
    }
    if (!ruleToImportHasVersion(rule)) {
      responses.push(missingVersionError(rule.rule_id));
      continue;
    }

    try {
      await validateMlAuth(mlAuthz, rule.type);
    } catch (e) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
      continue;
    }

    const [exceptionErrors, exceptionsList] = checkRuleExceptionReferences({ rule, existingLists });
    responses.push(...exceptionErrors);

    try {
      const { immutable, ruleSource } = ruleSourceImporter.calculateRuleSource(rule);
      prepared.push({ rule, immutable, ruleSource, exceptionsList });
    } catch (e) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  if (prepared.length === 0) {
    return { responses };
  }

  // Bulk lookup for `rule_id` conflicts: single parenthesized OR-list. Matches
  // the raw-interpolation convention in `getRuleByRuleId`.
  const ruleIds = prepared.map((p) => p.rule.rule_id);
  const filter = `alert.attributes.params.ruleId: (${ruleIds.map((id) => `"${id}"`).join(' OR ')})`;
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

  // Overwrite branch: stays per-rule via existing single-rule importRule. The
  // resulting full RuleResponse is collapsed to { rule_id } for a uniform
  // success shape across the overwrite and bulk-create branches.
  if (toOverwrite.length > 0) {
    const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const overwriteResults = await pMap(
      toOverwrite,
      async (p): Promise<BulkImportRuleSuccess | RuleImportErrorObject> => {
        try {
          const updated = (await importRuleSingle({
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
          })) as RuleResponse | RuleImportErrorObject;
          if (isRuleImportError(updated)) return updated;
          return { rule_id: updated.rule_id };
        } catch (err) {
          if (isRuleImportError(err)) return err;
          return createRuleImportErrorObject({
            ruleId: p.rule.rule_id,
            message: err?.message ?? 'unknown error',
          });
        }
      },
      // Mirror the old per-chunk Promise.all bound now that chunks are flattened.
      { concurrency: RULE_MANAGEMENT_IMPORT_BATCH_SIZE }
    );
    responses.push(...overwriteResults);
  }

  if (toBulkCreate.length === 0) {
    return { responses };
  }

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

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
    rules: bulkInputs,
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleImport,
      metadata: { bulkCount: rules.length },
    },
  });

  for (const id of successfulIds) {
    const source = inputById.get(id);
    if (source) {
      responses.push({ rule_id: source.rule.rule_id });
    }
  }

  bulkErrors.forEach((err) => {
    const source = inputById.get(err.rule.id);
    if (!source) return;
    responses.push(
      createRuleImportErrorObject({
        ruleId: source.rule.rule_id,
        message: err.message,
      })
    );
  });

  return { responses };
};
