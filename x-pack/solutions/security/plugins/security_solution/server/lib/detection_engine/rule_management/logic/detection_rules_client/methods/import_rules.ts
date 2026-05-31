/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';

import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { IRuleSourceImporter } from '../../import/rule_source_importer';
import {
  type RuleImportErrorObject,
  createRuleImportErrorObject,
  isRuleImportError,
} from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { importRule } from './import_rule';

const CHUNK_PARSED_OBJECT_SIZE = 50;

interface ImportRulesParams {
  rulesToImport: RuleToImport[];
  importOptions: ImportOptions;
  deps: ImportRulesDeps;
  changeTracking?: SecurityRuleChangeTracking<never>;
}

interface ImportOptions {
  overwriteRules: boolean;
  allowMissingConnectorSecrets?: boolean;
}

interface ImportRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  ruleSourceImporter: IRuleSourceImporter;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Imports rules in batches of 50, setting bulkCount to the total number of rules.
 */

export async function importRules({
  rulesToImport,
  importOptions: { overwriteRules, allowMissingConnectorSecrets },
  deps: {
    actionsClient,
    rulesClient,
    mlAuthz,
    prebuiltRuleAssetClient,
    ruleSourceImporter,
    savedObjectsClient,
  },
  changeTracking,
}: ImportRulesParams): Promise<Array<RuleResponse | RuleImportErrorObject>> {
  const bulkCount = rulesToImport.length;
  const trackingWithBulkCount: SecurityRuleChangeTracking<never> = {
    ...changeTracking,
    metadata: {
      bulkCount,
      ...changeTracking?.metadata,
    },
  };

  const existingLists = await getReferencedExceptionLists({
    rules: rulesToImport,
    savedObjectsClient,
  });
  await ruleSourceImporter.setup(rulesToImport);

  const allResults: Array<RuleResponse | RuleImportErrorObject> = [];

  for (const rulesBatch of chunk(rulesToImport, CHUNK_PARSED_OBJECT_SIZE)) {
    const batchResults = await Promise.all(
      rulesBatch.map(async (rule) => {
        const errors: RuleImportErrorObject[] = [];

        try {
          if (!ruleSourceImporter.isPrebuiltRule(rule)) {
            rule.version = rule.version ?? 1;
          }

          if (!ruleToImportHasVersion(rule)) {
            return createRuleImportErrorObject({
              message: i18n.translate(
                'xpack.securitySolution.detectionEngine.rules.cannotImportPrebuiltRuleWithoutVersion',
                {
                  defaultMessage:
                    'Prebuilt rules must specify a "version" to be imported. [rule_id: {ruleId}]',
                  values: { ruleId: rule.rule_id },
                }
              ),
              ruleId: rule.rule_id,
            });
          }

          const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
            rule,
            existingLists,
          });
          errors.push(...exceptionErrors);

          const { immutable, ruleSource } = ruleSourceImporter.calculateRuleSource(rule);
          const importedRule = await importRule({
            ruleToImport: {
              ...rule,
              exceptions_list: [...exceptions],
            },
            importOptions: {
              overwriteRule: overwriteRules,
              allowMissingConnectorSecrets,
              overrideFields: { rule_source: ruleSource, immutable },
            },
            deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient },
            changeTracking: trackingWithBulkCount,
          });

          return [...errors, importedRule];
        } catch (err) {
          const { error, message } = err;

          const caughtError = isRuleImportError(err)
            ? err
            : createRuleImportErrorObject({
                ruleId: rule.rule_id,
                message: message ?? error?.message ?? 'unknown error',
              });

          return [...errors, caughtError];
        }
      })
    );

    allResults.push(...batchResults.flat());
  }

  return allResults;
}
