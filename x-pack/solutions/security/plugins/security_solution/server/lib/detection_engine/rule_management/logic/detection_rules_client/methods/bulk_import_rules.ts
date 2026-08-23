/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { i18n } from '@kbn/i18n';
import { escapeQuotes } from '@kbn/es-query';
import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkCreateRulesParams, RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import {
  SecurityRuleChangeTrackingAction,
  type SecurityRuleChangeTracking,
} from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { findRules } from '../../search/find_rules';
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
import {
  RULE_MANAGEMENT_BULK_IMPORT_BATCH_SIZE,
  RULE_MANAGEMENT_IMPORT_BATCH_SIZE,
} from '../../../api/constants';

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
    changeTracking?: SecurityRuleChangeTracking<never>;
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
  const {
    rules,
    overwriteRules,
    ruleSourceImporter,
    allowMissingConnectorSecrets,
    changeTracking,
  } = args;
  if (rules.length === 0) return { responses: [] };

  const responses: Array<BulkImportRuleSuccess | RuleImportErrorObject> = [];

  // Contain any throw so one batch can't reject and abort the multi-batch loop mid-import.
  try {
    const existingLists = await getReferencedExceptionLists({ rules, savedObjectsClient });
    await ruleSourceImporter.setup(rules);

    const { prepared, errors: prepErrors } = await prepareRules({
      rules,
      mlAuthz,
      ruleSourceImporter,
      existingLists,
    });
    responses.push(...prepErrors);

    if (prepared.length === 0) {
      return { responses };
    }

    // One query resolves every `rule_id` conflict up front so we can classify the
    // whole set (overwrite vs create) without a per-rule existence check.
    const ruleIds = prepared.map((p) => p.rule.rule_id);
    const existingRuleIds = await findExistingRuleIds({ rulesClient, ruleIds });

    // Classify: conflict | overwrite-fallback | bulk-create.
    const conflicts: PreparedImport[] = [];
    const toOverwrite: PreparedImport[] = [];
    const toBulkCreate: PreparedImport[] = [];
    for (const p of prepared) {
      if (existingRuleIds.has(p.rule.rule_id)) {
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

    // Overwrite branch: stays per-rule via existing single-rule importRule. The full
    // RuleResponse is collapsed to { rule_id } for a uniform success shape.
    if (toOverwrite.length > 0) {
      responses.push(
        ...(await overwriteExisting({
          rules: toOverwrite,
          actionsClient,
          rulesClient,
          savedObjectsClient,
          mlAuthz,
          changeTracking,
          allowMissingConnectorSecrets,
        }))
      );
    }

    if (toBulkCreate.length === 0) {
      return { responses };
    }

    // Bulk-create new rules in a single alerting call. Pre-assign uuids so we
    // can re-pair successes/failures back to the source `rule_id`.
    const {
      bulkInputs,
      inputById,
      errors: buildErrors,
    } = buildBulkInputs({
      rules: toBulkCreate,
      actionsClient,
      allowMissingConnectorSecrets,
    });
    responses.push(...buildErrors);

    if (bulkInputs.length === 0) {
      return { responses };
    }

    const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
      rules: bulkInputs,
      batchSize: RULE_MANAGEMENT_BULK_IMPORT_BATCH_SIZE,
      changeTracking: { ...changeTracking, action: SecurityRuleChangeTrackingAction.ruleImport },
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const responded = new Set(
      responses.map((r) => (isRuleImportError(r) ? r.error.ruleId : r.rule_id))
    );
    for (const rule of rules) {
      if (!responded.has(rule.rule_id)) {
        responses.push(createRuleImportErrorObject({ ruleId: rule.rule_id, message }));
      }
    }
  }

  return { responses };
};

const prepareRules = async ({
  rules,
  mlAuthz,
  ruleSourceImporter,
  existingLists,
}: {
  rules: RuleToImport[];
  mlAuthz: MlAuthz;
  ruleSourceImporter: IRuleSourceImporter;
  existingLists: Awaited<ReturnType<typeof getReferencedExceptionLists>>;
}): Promise<{ prepared: PreparedImport[]; errors: RuleImportErrorObject[] }> => {
  const prepared: PreparedImport[] = [];
  const errors: RuleImportErrorObject[] = [];

  for (const rule of rules) {
    if (!ruleSourceImporter.isPrebuiltRule(rule)) {
      rule.version = rule.version ?? 1;
    }
    if (!ruleToImportHasVersion(rule)) {
      errors.push(missingVersionError(rule.rule_id));
    } else {
      try {
        await validateMlAuth(mlAuthz, rule.type);

        const [exceptionErrors, exceptionsList] = checkRuleExceptionReferences({
          rule,
          existingLists,
        });
        errors.push(...exceptionErrors);

        const { immutable, ruleSource } = ruleSourceImporter.calculateRuleSource(rule);
        prepared.push({ rule, immutable, ruleSource, exceptionsList });
      } catch (e) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: rule.rule_id,
            message: e instanceof Error ? e.message : String(e),
          })
        );
      }
    }
  }

  return { prepared, errors };
};

const findExistingRuleIds = async ({
  rulesClient,
  ruleIds,
}: {
  rulesClient: RulesClient;
  ruleIds: string[];
}): Promise<Set<string>> => {
  const filter = `alert.attributes.params.ruleId: (${ruleIds
    .map((id) => `"${escapeQuotes(id)}"`)
    .join(' OR ')})`;
  const found = await findRules({
    rulesClient,
    filter,
    page: 1,
    perPage: ruleIds.length,
    fields: ['params.ruleId'],
    sortField: undefined,
    sortOrder: undefined,
  });
  const existing = new Set<string>();
  for (const rule of found.data) {
    existing.add(rule.params.ruleId);
  }
  return existing;
};

const overwriteExisting = async ({
  rules,
  actionsClient,
  rulesClient,
  savedObjectsClient,
  mlAuthz,
  changeTracking,
  allowMissingConnectorSecrets,
}: {
  rules: PreparedImport[];
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  changeTracking?: SecurityRuleChangeTracking<never>;
  allowMissingConnectorSecrets?: boolean;
}): Promise<Array<BulkImportRuleSuccess | RuleImportErrorObject>> => {
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  return pMap(
    rules,
    async (p): Promise<BulkImportRuleSuccess | RuleImportErrorObject> => {
      try {
        const updated = (await importRuleSingle({
          actionsClient,
          rulesClient,
          mlAuthz,
          prebuiltRuleAssetClient,
          changeTracking,
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
    { concurrency: RULE_MANAGEMENT_IMPORT_BATCH_SIZE }
  );
};

const buildBulkInputs = ({
  rules,
  actionsClient,
  allowMissingConnectorSecrets,
}: {
  rules: PreparedImport[];
  actionsClient: ActionsClient;
  allowMissingConnectorSecrets?: boolean;
}): {
  bulkInputs: BulkCreateRulesParams<RuleParams>['rules'];
  inputById: Map<string, PreparedImport>;
  errors: RuleImportErrorObject[];
} => {
  const bulkInputs: BulkCreateRulesParams<RuleParams>['rules'] = [];
  const inputById = new Map<string, PreparedImport>();
  const errors: RuleImportErrorObject[] = [];

  for (const p of rules) {
    const id = uuidv4();
    try {
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
        // Alerting mints the API key and schedules the task inline for enabled rules.
        enabled: p.rule.enabled ?? false,
      };
      inputById.set(id, p);
      bulkInputs.push({ data, options: { id }, allowMissingConnectorSecrets });
    } catch (e) {
      errors.push(
        createRuleImportErrorObject({
          ruleId: p.rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  return { bulkInputs, inputById, errors };
};
