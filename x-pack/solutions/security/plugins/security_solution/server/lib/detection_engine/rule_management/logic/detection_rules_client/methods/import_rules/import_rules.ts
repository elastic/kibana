/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RuleToImport } from '../../../../../../../../common/api/detection_engine';
import type { MlAuthz } from '../../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createRuleImportErrorObject } from './errors';
import { getReferencedExceptionLists } from './gather_referenced_exceptions';
import { fetchPrebuiltImportContext } from './fetch_prebuilt_import_context';
import { findInstalledRulesBySignatureIds } from './find_installed_rules_by_signature_ids';
import { validateRulesToImport } from './validate_rules_to_import';
import { overwriteRules } from './overwrite_rules';
import { createRules } from './create_rules';
import type {
  ImportableRuleData,
  ImportRuleSuccess,
  ImportRulesOptions,
  ImportRulesResult,
  ImportRuleError,
} from './types';

interface ImportRulesParams {
  rules: RuleToImport[];
  options: ImportRulesOptions & { overwriteRules: boolean };
  deps: ImportRulesDeps;
}

interface ImportRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
}

export async function importRules({
  rules,
  options: importOptions,
  deps,
}: ImportRulesParams): Promise<ImportRulesResult> {
  const { actionsClient, rulesClient, savedObjectsClient, prebuiltRuleAssetClient, mlAuthz } = deps;
  const { overwriteRules: shouldOverwrite, ...writeOptions } = importOptions;

  if (rules.length === 0) {
    return { successes: [], errors: [] };
  }

  const successes: ImportRuleSuccess[] = [];
  const errors: ImportRuleError[] = [];

  try {
    // Step 1: Fetch data
    const [existingExceptionLists, prebuiltContext, existingRules] = await Promise.all([
      getReferencedExceptionLists({ rules, savedObjectsClient }),
      fetchPrebuiltImportContext({ rules, ruleAssetsClient: prebuiltRuleAssetClient }),
      findInstalledRulesBySignatureIds({
        rulesClient,
        ruleIds: rules.map((r) => r.rule_id),
      }),
    ]);

    // Step 2: Validate
    const { importableRules, errors: validationErrors } = await validateRulesToImport({
      rules,
      existingRules,
      existingExceptionLists,
      deps: {
        mlAuthz,
        prebuiltContext,
      },
    });
    errors.push(...validationErrors);

    if (importableRules.length > 0) {
      // Step 3: Split rules into buckets
      const conflicts: ImportableRuleData[] = [];
      const toCreate: ImportableRuleData[] = [];
      const toOverwrite: ImportableRuleData[] = [];

      for (const item of importableRules) {
        if (!existingRules[item.rule.rule_id]) {
          toCreate.push(item);
        } else if (shouldOverwrite) {
          toOverwrite.push(item);
        } else {
          conflicts.push(item);
        }
      }

      // Step 4: Process each bucket
      for (const { rule } of conflicts) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: rule.rule_id,
            type: 'conflict',
            message: 'Rule with this rule_id already exists',
          })
        );
      }

      if (toOverwrite.length > 0) {
        // Import originally allowed missing connector secrets on create and overwrite
        // (https://github.com/elastic/kibana/pull/148703#discussion_r1091925005).
        // DRC rewrite dropped it on update (#184954) no obvious reason why; so restoring it here.
        const overwritten = await overwriteRules({
          rules: toOverwrite,
          existingRules,
          matchingAssetsByRuleId: prebuiltContext.matchingAssetsByRuleId,
          options: writeOptions,
          deps: {
            actionsClient,
            rulesClient,
            prebuiltRuleAssetClient,
          },
        });
        successes.push(...overwritten.successes);
        errors.push(...overwritten.errors);
      }

      if (toCreate.length > 0) {
        const created = await createRules({
          rules: toCreate,
          options: writeOptions,
          deps: {
            actionsClient,
            rulesClient,
          },
        });
        successes.push(...created.successes);
        errors.push(...created.errors);
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const responded = new Set([
      ...successes.map((item) => item.rule_id),
      ...errors.map((item) => item.error.ruleId),
    ]);

    for (const rule of rules) {
      if (!responded.has(rule.rule_id)) {
        errors.push(createRuleImportErrorObject({ ruleId: rule.rule_id, message }));
      }
    }
  }

  return { successes, errors };
}
