/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type {
  BulkCreateRulesItem,
  BulkCreateRulesResult,
  RulesClient,
} from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import { SERVER_APP_ID } from '../../../../../../../common';
import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { findRules } from '../../search/find_rules';
import {
  type RuleImportErrorObject,
  createRuleImportErrorObject,
  isRuleImportError,
} from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import type { IRuleSourceImporter } from '../../import/rule_source_importer';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';
import type { IDetectionRulesClient } from '../detection_rules_client_interface';

interface BulkImportRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  detectionRulesClient: IDetectionRulesClient;
  mlAuthz: MlAuthz;
  savedObjectsClient: SavedObjectsClientContract;
  rules: RuleToImport[];
  overwriteRules: boolean;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
}

interface PreparedItem {
  rule: RuleToImport & { exceptions_list: RuleToImport['exceptions_list'] };
  immutable: boolean;
  ruleSource: ReturnType<IRuleSourceImporter['calculateRuleSource']>['ruleSource'];
  nonFatalErrors: RuleImportErrorObject[];
}

interface ClassifiedItems {
  overwriteItems: PreparedItem[];
  newItems: PreparedItem[];
  conflictErrors: RuleImportErrorObject[];
}

/**
 * Bulk variant of `methods/import_rules.ts`.
 *
 * Trades N per-rule SO writes for a single `rulesClient.bulkCreateRules` round-trip
 * for the new-rule case, with one optional follow-up `rulesClient.bulkEnableRules`
 * for any imports the user wanted enabled.
 *
 * Conflict detection (rule_id already exists) is also bulked: a single `findRules`
 * call per chunk classifies inputs into existing-vs-new before the create.
 *
 * Overwrite of existing rules (`overwriteRules: true` + rule already present) still
 * goes through the per-rule update path (`detectionRulesClient.importRule`), since
 * the alerting plugin does not expose a `bulkUpdateRules` primitive.
 */
export const bulkImportRules = async ({
  actionsClient,
  rulesClient,
  detectionRulesClient,
  mlAuthz,
  savedObjectsClient,
  rules,
  overwriteRules,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
}: BulkImportRulesOptions): Promise<Array<RuleResponse | RuleImportErrorObject>> => {
  if (rules.length === 0) {
    return [];
  }

  const existingLists = await getReferencedExceptionLists({ rules, savedObjectsClient });
  await ruleSourceImporter.setup(rules);

  const { preparedItems, fatalErrors } = await prepareItems({
    rules,
    existingLists,
    ruleSourceImporter,
    mlAuthz,
  });

  if (preparedItems.length === 0) {
    return fatalErrors;
  }

  const ruleIds = preparedItems.map((item) => item.rule.rule_id);
  const existingByRuleId = await findExistingRulesByRuleId(rulesClient, ruleIds);
  const { overwriteItems, newItems, conflictErrors } = classifyItems(
    preparedItems,
    existingByRuleId,
    overwriteRules
  );

  const overwriteResults = await runOverwrites({
    overwriteItems,
    detectionRulesClient,
    overwriteRules,
    allowMissingConnectorSecrets,
  });

  const { results: newResults, fatalErrors: newFatalErrors } = await runBulkCreate({
    newItems,
    actionsClient,
    rulesClient,
    allowMissingConnectorSecrets,
  });

  return [
    ...fatalErrors,
    ...newFatalErrors,
    ...conflictErrors,
    ...overwriteResults.flat(),
    ...newResults,
  ];
};

const prepareItems = async ({
  rules,
  existingLists,
  ruleSourceImporter,
  mlAuthz,
}: {
  rules: RuleToImport[];
  existingLists: Awaited<ReturnType<typeof getReferencedExceptionLists>>;
  ruleSourceImporter: IRuleSourceImporter;
  mlAuthz: MlAuthz;
}): Promise<{ preparedItems: PreparedItem[]; fatalErrors: RuleImportErrorObject[] }> => {
  const preparedItems: PreparedItem[] = [];
  const fatalErrors: RuleImportErrorObject[] = [];

  for (const rule of rules) {
    const result = await prepareSingleItem({ rule, existingLists, ruleSourceImporter, mlAuthz });
    if ('item' in result) {
      preparedItems.push(result.item);
    } else {
      fatalErrors.push(result.error);
    }
  }

  return { preparedItems, fatalErrors };
};

const prepareSingleItem = async ({
  rule,
  existingLists,
  ruleSourceImporter,
  mlAuthz,
}: {
  rule: RuleToImport;
  existingLists: Awaited<ReturnType<typeof getReferencedExceptionLists>>;
  ruleSourceImporter: IRuleSourceImporter;
  mlAuthz: MlAuthz;
}): Promise<{ item: PreparedItem } | { error: RuleImportErrorObject }> => {
  try {
    if (!ruleSourceImporter.isPrebuiltRule(rule)) {
      rule.version = rule.version ?? 1;
    }

    if (!ruleToImportHasVersion(rule)) {
      return { error: missingVersionError(rule.rule_id) };
    }

    await validateMlAuth(mlAuthz, rule.type);

    const [exceptionErrors, exceptions] = checkRuleExceptionReferences({ rule, existingLists });
    const { immutable, ruleSource } = ruleSourceImporter.calculateRuleSource(rule);

    return {
      item: {
        rule: { ...rule, exceptions_list: [...exceptions] },
        immutable,
        ruleSource,
        nonFatalErrors: exceptionErrors,
      },
    };
  } catch (err) {
    return { error: toImportError(err, rule.rule_id) };
  }
};

const classifyItems = (
  preparedItems: PreparedItem[],
  existingByRuleId: Map<string, RuleResponse>,
  overwriteRules: boolean
): ClassifiedItems => {
  const overwriteItems: PreparedItem[] = [];
  const newItems: PreparedItem[] = [];
  const conflictErrors: RuleImportErrorObject[] = [];

  for (const item of preparedItems) {
    const existing = existingByRuleId.get(item.rule.rule_id);
    if (!existing) {
      newItems.push(item);
    } else if (overwriteRules) {
      overwriteItems.push(item);
    } else {
      conflictErrors.push(
        createRuleImportErrorObject({
          ruleId: existing.rule_id,
          type: 'conflict',
          message: 'Rule with this rule_id already exists',
        })
      );
    }
  }

  return { overwriteItems, newItems, conflictErrors };
};

/**
 * Per-rule update fallback for the overwrite path. No `bulkUpdateRules` primitive
 * exists on the alerting side yet, so this stays at single-rule granularity.
 */
const runOverwrites = async ({
  overwriteItems,
  detectionRulesClient,
  overwriteRules,
  allowMissingConnectorSecrets,
}: {
  overwriteItems: PreparedItem[];
  detectionRulesClient: IDetectionRulesClient;
  overwriteRules: boolean;
  allowMissingConnectorSecrets?: boolean;
}): Promise<Array<Array<RuleResponse | RuleImportErrorObject>>> => {
  return Promise.all(
    overwriteItems.map(async (item) => {
      try {
        const importedRule = await detectionRulesClient.importRule({
          ruleToImport: item.rule,
          overrideFields: { rule_source: item.ruleSource, immutable: item.immutable },
          overwriteRules,
          allowMissingConnectorSecrets,
        });
        return [...item.nonFatalErrors, importedRule];
      } catch (err) {
        return [...item.nonFatalErrors, toImportError(err, item.rule.rule_id)];
      }
    })
  );
};

interface BulkInputContext {
  bulkInputs: Array<BulkCreateRulesItem<RuleParams>>;
  idToItem: Map<string, PreparedItem>;
  ruleIdToWantedEnabled: Map<string, boolean>;
  fatalErrors: RuleImportErrorObject[];
}

const buildBulkInputs = ({
  newItems,
  actionsClient,
  allowMissingConnectorSecrets,
}: {
  newItems: PreparedItem[];
  actionsClient: ActionsClient;
  allowMissingConnectorSecrets?: boolean;
}): BulkInputContext => {
  const bulkInputs: Array<BulkCreateRulesItem<RuleParams>> = [];
  const idToItem = new Map<string, PreparedItem>();
  const ruleIdToWantedEnabled = new Map<string, boolean>();
  const fatalErrors: RuleImportErrorObject[] = [];

  for (const item of newItems) {
    try {
      const ruleWithDefaults = applyRuleDefaults({
        ...item.rule,
        immutable: item.immutable,
      });
      const id = uuidv4();
      idToItem.set(id, item);
      ruleIdToWantedEnabled.set(id, item.rule.enabled === true);

      bulkInputs.push({
        data: {
          ...convertRuleResponseToAlertingRule(ruleWithDefaults, actionsClient),
          alertTypeId: ruleTypeMappings[item.rule.type],
          consumer: SERVER_APP_ID,
          // The alerting bulk create rejects enabled rules; force-disable here
          // and re-enable below via bulkEnableRules for the ones the user wanted.
          enabled: false,
        },
        options: { id },
        allowMissingConnectorSecrets,
      });
    } catch (err) {
      fatalErrors.push(toImportError(err, item.rule.rule_id));
    }
  }

  return { bulkInputs, idToItem, ruleIdToWantedEnabled, fatalErrors };
};

/**
 * Phase 3b/3c: one bulk create for all new rules, then one optional bulk enable
 * for the subset whose import payload requested `enabled: true`.
 */
const runBulkCreate = async ({
  newItems,
  actionsClient,
  rulesClient,
  allowMissingConnectorSecrets,
}: {
  newItems: PreparedItem[];
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  allowMissingConnectorSecrets?: boolean;
}): Promise<{
  results: Array<RuleResponse | RuleImportErrorObject>;
  fatalErrors: RuleImportErrorObject[];
}> => {
  const { bulkInputs, idToItem, ruleIdToWantedEnabled, fatalErrors } = buildBulkInputs({
    newItems,
    actionsClient,
    allowMissingConnectorSecrets,
  });

  if (bulkInputs.length === 0) {
    return { results: [], fatalErrors };
  }

  const bulkResult = await rulesClient.bulkCreateRules<RuleParams>({ rules: bulkInputs });
  const { results, successfullyCreatedIds } = collectBulkCreateResults({
    bulkResult,
    idToItem,
    ruleIdToWantedEnabled,
  });

  if (successfullyCreatedIds.length > 0) {
    const enableErrors = await runBulkEnable({
      rulesClient,
      ids: successfullyCreatedIds,
      idToItem,
    });
    results.push(...enableErrors);
  }

  return { results, fatalErrors };
};

const collectBulkCreateResults = ({
  bulkResult,
  idToItem,
  ruleIdToWantedEnabled,
}: {
  bulkResult: BulkCreateRulesResult<RuleParams>;
  idToItem: Map<string, PreparedItem>;
  ruleIdToWantedEnabled: Map<string, boolean>;
}): {
  results: Array<RuleResponse | RuleImportErrorObject>;
  successfullyCreatedIds: string[];
} => {
  const results: Array<RuleResponse | RuleImportErrorObject> = [];
  const successfullyCreatedIds: string[] = [];

  for (const created of bulkResult.rules) {
    const item = idToItem.get(created.id);
    if (item) {
      try {
        const ruleResponse = convertAlertingRuleToRuleResponse(created);
        results.push(...item.nonFatalErrors, ruleResponse);
        if (ruleIdToWantedEnabled.get(created.id)) {
          successfullyCreatedIds.push(created.id);
        }
      } catch (err) {
        results.push(...item.nonFatalErrors, toImportError(err, item.rule.rule_id));
      }
    }
  }

  for (const failure of bulkResult.errors) {
    const item = idToItem.get(failure.rule.id);
    if (item) {
      results.push(
        ...item.nonFatalErrors,
        createRuleImportErrorObject({
          ruleId: item.rule.rule_id,
          message: failure.message ?? 'Failed to create rule',
        })
      );
    }
  }

  return { results, successfullyCreatedIds };
};

const runBulkEnable = async ({
  rulesClient,
  ids,
  idToItem,
}: {
  rulesClient: RulesClient;
  ids: string[];
  idToItem: Map<string, PreparedItem>;
}): Promise<RuleImportErrorObject[]> => {
  const enableResult = await rulesClient.bulkEnableRules({ ids });
  const errors: RuleImportErrorObject[] = [];

  for (const enableError of enableResult.errors) {
    const item = idToItem.get(enableError.rule.id);
    if (item) {
      errors.push(
        createRuleImportErrorObject({
          ruleId: item.rule.rule_id,
          message: `Rule was created but failed to enable: ${enableError.message}`,
        })
      );
    }
  }

  return errors;
};

const findExistingRulesByRuleId = async (
  rulesClient: RulesClient,
  ruleIds: string[]
): Promise<Map<string, RuleResponse>> => {
  if (ruleIds.length === 0) {
    return new Map();
  }

  // KQL escape for double-quoted literals: rule_id is a free-form RuleSignatureId,
  // not guaranteed to be a UUID, so backslashes and quotes must be escaped.
  const escape = (id: string) => id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const filter = `alert.attributes.params.ruleId: (${ruleIds
    .map((id) => `"${escape(id)}"`)
    .join(' OR ')})`;

  const findResult = await findRules({
    rulesClient,
    filter,
    page: 1,
    perPage: ruleIds.length,
    fields: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });

  const map = new Map<string, RuleResponse>();
  for (const rule of findResult.data) {
    try {
      const response = convertAlertingRuleToRuleResponse(rule);
      map.set(response.rule_id, response);
    } catch {
      // If a stored rule fails to convert we simply omit it from the lookup;
      // the import will then attempt to create a rule with that rule_id and
      // surface any conflict via the SO bulkCreate response.
    }
  }
  return map;
};

const missingVersionError = (ruleId: string): RuleImportErrorObject =>
  createRuleImportErrorObject({
    message: i18n.translate(
      'xpack.securitySolution.detectionEngine.rules.cannotImportPrebuiltRuleWithoutVersion',
      {
        defaultMessage:
          'Prebuilt rules must specify a "version" to be imported. [rule_id: {ruleId}]',
        values: { ruleId },
      }
    ),
    ruleId,
  });

const toImportError = (err: unknown, ruleId: string): RuleImportErrorObject => {
  if (isRuleImportError(err)) {
    return err;
  }
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'unknown error';
  return createRuleImportErrorObject({ ruleId, message });
};
