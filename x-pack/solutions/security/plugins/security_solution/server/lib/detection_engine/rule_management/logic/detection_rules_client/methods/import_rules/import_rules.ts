/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleToImport } from '../../../../../../../../common/api/detection_engine';
import type { MlAuthz } from '../../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { RULE_IMPORT_BULK_CREATE_BATCH_SIZE } from '../../../../api/constants';
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
  ImportRulesResult,
  ImportRuleError,
} from './types';

interface ImportRulesParams {
  rules: RuleToImport[];
  options: ImportRulesOptions;
  deps: ImportRulesDeps;
}

interface ImportRulesOptions {
  overwriteRules: boolean;
  allowMissingConnectorSecrets?: boolean;
  changeTracking?: SecurityRuleChangeTracking;
  batchSize?: number;
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

  if (rules.length === 0) {
    return { successes: [], errors: [] };
  }

  const batchSize = importOptions.batchSize ?? RULE_IMPORT_BULK_CREATE_BATCH_SIZE;
  const successes: ImportRuleSuccess[] = [];
  const errors: ImportRuleError[] = [];

  // Outer batching caps find/validate/KQL. Inner `bulkCreateRules` uses the
  // same size so each outer batch is one alerting bulk request.
  for (const batch of chunk(batchSize, rules)) {
    // Note that "outer batching" should be moved out of this DRC method into `route.ts` if we want to chunk at
    // the file level and stream its contents. To avoid loading all imported rules before processing (memory footgun).
    try {
      // Step 1: Fetch data
      const [existingExceptionLists, prebuiltContext, existingRules] = await Promise.all([
        getReferencedExceptionLists({ rules: batch, savedObjectsClient }),
        fetchPrebuiltImportContext({ rules: batch, ruleAssetsClient: prebuiltRuleAssetClient }),
        findInstalledRulesBySignatureIds({
          rulesClient,
          ruleIds: batch.map((r) => r.rule_id),
        }),
      ]);

      // Step 2: Validate
      const { importableRules, errors: validationErrors } = await validateRulesToImport({
        rules: batch,
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
          } else if (importOptions.overwriteRules) {
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
          const overwritten = await overwriteRules({
            rules: toOverwrite,
            existingRules,
            deps: {
              actionsClient,
              rulesClient,
              prebuiltRuleAssetClient,
              changeTracking: importOptions.changeTracking,
            },
          });
          successes.push(...overwritten.successes);
          errors.push(...overwritten.errors);
        }

        if (toCreate.length > 0) {
          const created = await createRules({
            rules: toCreate,
            options: {
              allowMissingConnectorSecrets: importOptions.allowMissingConnectorSecrets,
              changeTracking: importOptions.changeTracking,
              batchSize,
            },
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

      for (const rule of batch) {
        if (!responded.has(rule.rule_id)) {
          errors.push(createRuleImportErrorObject({ ruleId: rule.rule_id, message }));
        }
      }
    }
  }

  return { successes, errors };
}
