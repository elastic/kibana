/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { RuleTranslationResult } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import { RuleMigrationRuleData } from '@kbn/security-solution-plugin/common/siem_migrations/model/rule_migration.gen';
import { deleteAllRules } from '../../../../../common/utils/security_solution';
import {
  createMigrationRules,
  defaultElasticRule,
  deleteAllRuleMigrations,
  getMigrationRuleDocuments,
  ruleMigrationRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  deleteAllTimelines,
} from '../../../detections_response/utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Get Prebuilt Rules API', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRuleMigrations(es);

      // Add some prebuilt rules
      const ruleAssetSavedObjects = [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-4', version: 1 }),
        createRuleAssetSavedObject({ rule_id: 'rule-5', version: 1 }),
      ];
      await createPrebuiltRuleAssetSavedObjects(es, ruleAssetSavedObjects);
    });

    it('should return all prebuilt rules matched by migration rules', async () => {
      const migrationId = uuidv4();

      const overrideCallback = (index: number): Partial<RuleMigrationRuleData> => {
        const { query_language: queryLanguage, query, ...rest } = defaultElasticRule;
        return {
          migration_id: migrationId,
          elastic_rule: index < 2 ? { ...rest, prebuilt_rule_id: `rule-${index + 1}` } : undefined,
          translation_result: index < 2 ? RuleTranslationResult.FULL : undefined,
        };
      };
      const migrationRuleDocuments = getMigrationRuleDocuments(4, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.getPrebuiltRules({ migrationId });

      const prebuiltRulesIds = Object.keys(response.body).sort();
      expect(prebuiltRulesIds).toEqual(['rule-1', 'rule-2']);
    });

    it('should return empty response when migration rules did not match prebuilt rules', async () => {
      const migrationId = uuidv4();

      const migrationRuleDocuments = getMigrationRuleDocuments(10, () => ({
        migration_id: migrationId,
      }));
      await createMigrationRules(es, migrationRuleDocuments);

      const response = await migrationRulesRoutes.getPrebuiltRules({ migrationId });
      expect(response.body).toEqual({});
    });
  });
};
