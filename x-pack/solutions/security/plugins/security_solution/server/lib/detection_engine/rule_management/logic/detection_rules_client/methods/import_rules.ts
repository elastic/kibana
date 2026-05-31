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

/**
 * Imports rules in batches of 50, setting bulkCount to the total number of rules.
 */

export const importRules = async ({
  allowMissingConnectorSecrets,
  actionsClient,
  rulesClient,
  mlAuthz,
  prebuiltRuleAssetClient,
  overwriteRules,
  ruleSourceImporter,
  rules,
  savedObjectsClient,
  changeTracking,
}: {
  allowMissingConnectorSecrets?: boolean;
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  overwriteRules: boolean;
  ruleSourceImporter: IRuleSourceImporter;
  rules: RuleToImport[];
  savedObjectsClient: SavedObjectsClientContract;
  changeTracking?: SecurityRuleChangeTracking<never>;
}): Promise<Array<RuleResponse | RuleImportErrorObject>> => {
  const bulkCount = rules.length;
  const trackingWithBulkCount: SecurityRuleChangeTracking<never> = {
    ...changeTracking,
    metadata: {
      bulkCount,
      ...changeTracking?.metadata,
    },
  };

  const existingLists = await getReferencedExceptionLists({
    rules,
    savedObjectsClient,
  });
  await ruleSourceImporter.setup(rules);

  const allResults: Array<RuleResponse | RuleImportErrorObject> = [];

  for (const rulesBatch of chunk(rules, CHUNK_PARSED_OBJECT_SIZE)) {
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
            actionsClient,
            rulesClient,
            mlAuthz,
            prebuiltRuleAssetClient,
            importRulePayload: {
              ruleToImport: {
                ...rule,
                exceptions_list: [...exceptions],
              },
              changeTracking: trackingWithBulkCount,
              overrideFields: { rule_source: ruleSource, immutable },
              overwriteRules,
              allowMissingConnectorSecrets,
            },
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
};
