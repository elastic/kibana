/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type {
  BulkCreateRulesParams,
  BulkUpdateRulesParams,
  RulesClient,
} from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { validateMlAuth } from '../utils';
import {
  type RuleImportErrorObject,
  createRuleImportErrorObject,
  isRuleImportError,
} from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import {
  fetchPrebuiltImportContext,
  type PrebuiltImportContext,
} from '../../import/fetch_prebuilt_import_context';
import { findInstalledRulesByRuleIds } from '../../import/find_installed_rules_by_rule_ids';
import { calculateRuleSourceForImport } from '../../import/calculate_rule_source_for_import';
import {
  createPrebuiltRuleAssetsClient,
  type IPrebuiltRuleAssetsClient,
} from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { RULE_IMPORT_BATCH_SIZE } from '../../../api/constants';

interface ImportRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  args: {
    rules: RuleToImport[];
    overwriteRules: boolean;
    allowMissingConnectorSecrets?: boolean;
    changeTracking?: SecurityRuleChangeTracking;
  };
}

export interface ImportRuleSuccess {
  rule_id: string;
}

export interface ImportRulesResult {
  responses: Array<ImportRuleSuccess | RuleImportErrorObject>;
}

// Survivors of per-rule prep that proceed to conflict classification.
interface PreparedImport {
  rule: RuleToImport;
  immutable: boolean;
  ruleSource: ReturnType<typeof calculateRuleSourceForImport>['ruleSource'];
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

export const importRules = async ({
  actionsClient,
  rulesClient,
  savedObjectsClient,
  mlAuthz,
  args,
}: ImportRulesOptions): Promise<ImportRulesResult> => {
  const { rules, overwriteRules, allowMissingConnectorSecrets, changeTracking } = args;
  if (rules.length === 0) return { responses: [] };

  const responses: Array<ImportRuleSuccess | RuleImportErrorObject> = [];

  // Contain any throw so one batch can't reject and abort the multi-batch loop mid-import.
  try {
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const [existingLists, prebuiltContext, installedRulesById] = await Promise.all([
      getReferencedExceptionLists({ rules, savedObjectsClient }),
      fetchPrebuiltImportContext({ rules, ruleAssetsClient }),
      findInstalledRulesByRuleIds({ rulesClient, ruleIds: rules.map((r) => r.rule_id) }),
    ]);

    const { prepared, errors: prepErrors } = await prepareRules({
      rules,
      mlAuthz,
      prebuiltContext,
      installedRulesById,
      existingLists,
    });
    responses.push(...prepErrors);

    if (prepared.length === 0) {
      return { responses };
    }

    // Classify: conflict | update | create using the installed-rules map.
    const conflicts: PreparedImport[] = [];
    const toUpdate: PreparedImport[] = [];
    const toCreate: PreparedImport[] = [];
    for (const p of prepared) {
      if (installedRulesById[p.rule.rule_id]) {
        if (overwriteRules) toUpdate.push(p);
        else conflicts.push(p);
      } else {
        toCreate.push(p);
      }
    }

    for (const p of conflicts) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: p.rule.rule_id,
          type: 'conflict',
          message: 'Rule with this rule_id already exists',
        })
      );
    }

    if (toUpdate.length > 0) {
      responses.push(
        ...(await updateRules({
          rules: toUpdate,
          installedRulesById,
          actionsClient,
          rulesClient,
          ruleAssetsClient,
          changeTracking,
          allowMissingConnectorSecrets,
        }))
      );
    }

    if (toCreate.length > 0) {
      responses.push(
        ...(await createRules({
          rules: toCreate,
          actionsClient,
          rulesClient,
          changeTracking,
          allowMissingConnectorSecrets,
        }))
      );
    }
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
  prebuiltContext,
  installedRulesById,
  existingLists,
}: {
  rules: RuleToImport[];
  mlAuthz: MlAuthz;
  prebuiltContext: PrebuiltImportContext;
  installedRulesById: Record<string, RuleResponse>;
  existingLists: Awaited<ReturnType<typeof getReferencedExceptionLists>>;
}): Promise<{ prepared: PreparedImport[]; errors: RuleImportErrorObject[] }> => {
  const prepared: PreparedImport[] = [];
  const errors: RuleImportErrorObject[] = [];

  for (const rule of rules) {
    if (!prebuiltContext.availableRuleAssetIds.has(rule.rule_id)) {
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

        const { immutable, ruleSource } = calculateRuleSourceForImport({
          importedRule: rule,
          currentRule: installedRulesById[rule.rule_id],
          prebuiltRuleAssetsByRuleId: prebuiltContext.matchingAssetsByRuleId,
          isKnownPrebuiltRule: prebuiltContext.availableRuleAssetIds.has(rule.rule_id),
        });
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

const createRules = async ({
  rules,
  actionsClient,
  rulesClient,
  changeTracking,
  allowMissingConnectorSecrets,
}: {
  rules: PreparedImport[];
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  changeTracking?: SecurityRuleChangeTracking;
  allowMissingConnectorSecrets?: boolean;
}): Promise<Array<ImportRuleSuccess | RuleImportErrorObject>> => {
  const responses: Array<ImportRuleSuccess | RuleImportErrorObject> = [];
  const bulkInputs: BulkCreateRulesParams<RuleParams>['rules'] = [];
  const inputById = new Map<string, PreparedImport>();

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
      responses.push(
        createRuleImportErrorObject({
          ruleId: p.rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  if (bulkInputs.length === 0) {
    return responses;
  }

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
    rules: bulkInputs,
    batchSize: RULE_IMPORT_BATCH_SIZE,
    changeTracking,
  });

  for (const id of successfulIds) {
    const source = inputById.get(id);
    if (source) {
      responses.push({ rule_id: source.rule.rule_id });
    }
  }

  for (const err of bulkErrors) {
    const source = inputById.get(err.rule.id);
    if (source) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: source.rule.rule_id,
          message: err.message,
        })
      );
    }
  }

  return responses;
};

const updateRules = async ({
  rules,
  installedRulesById,
  actionsClient,
  rulesClient,
  ruleAssetsClient,
  changeTracking,
  allowMissingConnectorSecrets,
}: {
  rules: PreparedImport[];
  installedRulesById: Record<string, RuleResponse>;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  changeTracking?: SecurityRuleChangeTracking;
  allowMissingConnectorSecrets?: boolean;
}): Promise<Array<ImportRuleSuccess | RuleImportErrorObject>> => {
  const responses: Array<ImportRuleSuccess | RuleImportErrorObject> = [];
  const bulkInputs: BulkUpdateRulesParams<RuleParams>['rules'] = [];
  const inputById = new Map<string, PreparedImport>();
  const toEnable: string[] = [];
  const toDisable: string[] = [];

  for (const p of rules) {
    const existingRule = installedRulesById[p.rule.rule_id];
    if (!existingRule) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: p.rule.rule_id,
          message: 'Rule with this rule_id was not found',
        })
      );
    } else {
      try {
        const overrideFields = { rule_source: p.ruleSource, immutable: p.immutable };
        let ruleWithUpdates = await applyRuleUpdate({
          prebuiltRuleAssetClient: ruleAssetsClient,
          existingRule,
          ruleUpdate: {
            ...p.rule,
            exceptions_list: [...(p.exceptionsList ?? [])],
            ...overrideFields,
          },
        });
        ruleWithUpdates = { ...ruleWithUpdates, ...overrideFields };

        const requestedEnabled = p.rule.enabled ?? existingRule.enabled;
        if (!existingRule.enabled && requestedEnabled) {
          toEnable.push(existingRule.id);
        } else if (existingRule.enabled && !requestedEnabled) {
          toDisable.push(existingRule.id);
        }

        inputById.set(existingRule.id, p);
        bulkInputs.push({
          id: existingRule.id,
          data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
        });
      } catch (e) {
        responses.push(
          createRuleImportErrorObject({
            ruleId: p.rule.rule_id,
            message: e instanceof Error ? e.message : String(e),
          })
        );
      }
    }
  }

  if (bulkInputs.length === 0) {
    return responses;
  }

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkUpdateRules<RuleParams>({
    rules: bulkInputs,
    batchSize: RULE_IMPORT_BATCH_SIZE,
    skipIfUnchanged: true,
    allowMissingConnectorSecrets,
    changeTracking,
  });

  const successIds = new Set(successfulIds);
  const enableIds = toEnable.filter((id) => successIds.has(id));
  const disableIds = toDisable.filter((id) => successIds.has(id));
  const { errors: toggleErrors, failedIds } = await toggleImportedEnabled({
    rulesClient,
    inputById,
    enableIds,
    disableIds,
  });

  for (const id of successfulIds) {
    const source = inputById.get(id);
    if (source && !failedIds.has(id)) {
      responses.push({ rule_id: source.rule.rule_id });
    }
  }

  for (const err of bulkErrors) {
    const source = inputById.get(err.rule.id);
    if (source) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: source.rule.rule_id,
          message: err.message,
        })
      );
    }
  }

  responses.push(...toggleErrors);
  return responses;
};

const toggleImportedEnabled = async ({
  rulesClient,
  inputById,
  enableIds,
  disableIds,
}: {
  rulesClient: RulesClient;
  inputById: Map<string, PreparedImport>;
  enableIds: string[];
  disableIds: string[];
}): Promise<{ errors: RuleImportErrorObject[]; failedIds: Set<string> }> => {
  const errors: RuleImportErrorObject[] = [];
  const failedIds = new Set<string>();

  if (enableIds.length > 0) {
    const { errors: enableErrors } = await rulesClient.bulkEnableRules({ ids: enableIds });
    for (const err of enableErrors) {
      failedIds.add(err.rule.id);
      const source = inputById.get(err.rule.id);
      if (source) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: source.rule.rule_id,
            message: err.message,
          })
        );
      }
    }
  }
  if (disableIds.length > 0) {
    const { errors: disableErrors } = await rulesClient.bulkDisableRules({ ids: disableIds });
    for (const err of disableErrors) {
      failedIds.add(err.rule.id);
      const source = inputById.get(err.rule.id);
      if (source) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: source.rule.rule_id,
            message: err.message,
          })
        );
      }
    }
  }

  return { errors, failedIds };
};
