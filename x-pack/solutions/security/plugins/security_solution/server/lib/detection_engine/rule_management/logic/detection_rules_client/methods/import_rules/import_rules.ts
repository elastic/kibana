/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleToImport } from '../../../../../../../../common/api/detection_engine';
import type { MlAuthz } from '../../../../../../machine_learning/authz';
import { createRuleImportErrorObject, isRuleImportError } from './errors';
import { getReferencedExceptionLists } from './gather_referenced_exceptions';
import { fetchPrebuiltImportContext } from './fetch_prebuilt_import_context';
import { findInstalledRulesByRuleIds } from './find_installed_rules_by_rule_ids';
import { createPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { validateRulesToImport } from './validate_rules_to_import';
import { splitIntoGroups } from './split_into_groups';
import { overwriteRules } from './overwrite_rules';
import { createRules } from './create_rules';
import type { ImportRuleSuccess, ImportRulesResult, RuleImportErrorObject } from './types';

interface ImportRulesParams {
  rules: RuleToImport[];
  options: ImportRulesOptions;
  deps: ImportRulesDeps;
}

interface ImportRulesOptions {
  overwriteRules: boolean;
  allowMissingConnectorSecrets?: boolean;
  changeTracking?: SecurityRuleChangeTracking;
}

interface ImportRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
}

export async function importRules({
  rules,
  options: importOptions,
  deps,
}: ImportRulesParams): Promise<ImportRulesResult> {
  const { actionsClient, rulesClient, savedObjectsClient, mlAuthz } = deps;

  if (rules.length === 0) {
    return { responses: [] };
  }

  const responses: Array<ImportRuleSuccess | RuleImportErrorObject> = [];

  // Contain any throw so one batch can't reject and abort the multi-batch loop mid-import.
  try {
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    const [existingExceptionLists, prebuiltContext, existingRules] = await Promise.all([
      getReferencedExceptionLists({ rules, savedObjectsClient }),
      fetchPrebuiltImportContext({ rules, ruleAssetsClient }),
      findInstalledRulesByRuleIds({ rulesClient, ruleIds: rules.map((r) => r.rule_id) }),
    ]);

    const { importableRules, errors: validationErrors } = await validateRulesToImport({
      rules,
      existingRules,
      existingExceptionLists,
      deps: {
        mlAuthz,
        prebuiltContext,
      },
    });
    responses.push(...validationErrors);

    if (importableRules.length === 0) {
      return { responses };
    }

    const ruleGroups = splitIntoGroups({
      rules: importableRules,
      existingRules,
      overwriteExistingRules: importOptions.overwriteRules,
    });

    for (const { rule } of ruleGroups.conflicts) {
      responses.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          type: 'conflict',
          message: 'Rule with this rule_id already exists',
        })
      );
    }

    if (ruleGroups.toOverwrite.length > 0) {
      responses.push(
        ...(await overwriteRules({
          rules: ruleGroups.toOverwrite,
          existingRules,
          deps: {
            actionsClient,
            rulesClient,
            savedObjectsClient,
            changeTracking: importOptions.changeTracking,
          },
        }))
      );
    }

    if (ruleGroups.toCreate.length > 0) {
      responses.push(
        ...(await createRules({
          rules: ruleGroups.toCreate,
          options: {
            allowMissingConnectorSecrets: importOptions.allowMissingConnectorSecrets,
            changeTracking: importOptions.changeTracking,
          },
          deps: {
            actionsClient,
            rulesClient,
          },
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
}
