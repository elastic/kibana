/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { ElasticRule } from '@kbn/security-solution-plugin/common/siem_migrations/model/rule_migration.gen';
import { RuleTranslationResult } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '../../../../../common/utils/security_solution';
import {
  RuleMigrationDocument,
  createMigrationRules,
  defaultElasticRule,
  deleteAllMigrationRules,
  getMigrationRuleDocuments,
  migrationRulesRouteHelpersFactory,
  statsOverrideCallbackFactory,
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
  const securitySolutionApi = getService('securitySolutionApi');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Install API', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllMigrationRules(es);
    });

    it('should install all installable custom migration rules', async () => {
      const migrationId = uuidv4();

      const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
        const title = `Rule - ${index}`;
        const elasticRule = { ...defaultElasticRule, title };
        return {
          migration_id: migrationId,
          elastic_rule: elasticRule,
          translation_result: index < 2 ? RuleTranslationResult.FULL : undefined,
        };
      };

      const migrationRuleDocuments = getMigrationRuleDocuments(5, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const installResponse = await migrationRulesRoutes.install({ migrationId, payload: {} });
      expect(installResponse.body).toEqual({ installed: 2 });

      // fetch installed migration rules information
      const response = await migrationRulesRoutes.get({ migrationId });
      const installedMigrationRules = response.body.data.reduce((acc, item) => {
        if (item.elastic_rule?.id) {
          acc.push(item.elastic_rule);
        }
        return acc;
      }, [] as ElasticRule[]);
      expect(installedMigrationRules.length).toEqual(2);

      // fetch installed rules
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      const expectedRulesData = expect.arrayContaining(
        installedMigrationRules.map((migrationRule) =>
          expect.objectContaining({
            id: migrationRule.id,
            name: migrationRule.title,
          })
        )
      );

      expect(rulesResponse.data).toEqual(expectedRulesData);

      // Installed rules should be disabled
      rulesResponse.data.forEach((rule: RuleResponse) => {
        expect(rule.enabled).toEqual(false);
      });
    });

    it('should install all installable migration rules matched with prebuilt rules', async () => {
      const ruleAssetSavedObject = createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 });
      await createPrebuiltRuleAssetSavedObjects(es, [ruleAssetSavedObject]);

      const migrationId = uuidv4();

      const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
        const { query_language: queryLanguage, query, ...rest } = defaultElasticRule;
        return {
          migration_id: migrationId,
          elastic_rule: index < 2 ? { ...rest, prebuilt_rule_id: 'rule-1' } : undefined,
          translation_result: index < 2 ? RuleTranslationResult.FULL : undefined,
        };
      };
      const migrationRuleDocuments = getMigrationRuleDocuments(4, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const installResponse = await migrationRulesRoutes.install({ migrationId, payload: {} });
      expect(installResponse.body).toEqual({ installed: 2 });

      // fetch installed rules
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      const expectedInstalledRules = expect.arrayContaining([
        expect.objectContaining(ruleAssetSavedObject['security-rule']),
      ]);
      expect(rulesResponse.data.length).toEqual(1);
      expect(rulesResponse.data).toEqual(expectedInstalledRules);

      // Installed rules should be disabled
      rulesResponse.data.forEach((rule: RuleResponse) => {
        expect(rule.enabled).toEqual(false);
      });
    });

    it('should install and enable all installable migration rules', async () => {
      const migrationId = uuidv4();

      const overrideCallback = statsOverrideCallbackFactory({
        migrationId,
        completed: 2,
        fullyTranslated: 2,
      });
      const migrationRuleDocuments = getMigrationRuleDocuments(2, overrideCallback);
      await createMigrationRules(es, migrationRuleDocuments);

      const installResponse = await migrationRulesRoutes.install({
        migrationId,
        payload: { enabled: true },
      });
      expect(installResponse.body).toEqual({ installed: 2 });

      // fetch installed rules
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      expect(rulesResponse.data.length).toEqual(2);

      // Installed rules should be enabled
      rulesResponse.data.forEach((rule: RuleResponse) => {
        expect(rule.enabled).toEqual(true);
      });
    });

    it('should install migration rules by ids', async () => {
      const migrationId = uuidv4();

      const overrideCallback = statsOverrideCallbackFactory({
        migrationId,
        completed: 5,
        fullyTranslated: 5,
      });
      const migrationRuleDocuments = getMigrationRuleDocuments(5, overrideCallback);
      const createdDocumentIds = await createMigrationRules(es, migrationRuleDocuments);

      // Migration rules to install by ids
      const ids = createdDocumentIds.slice(0, 3);

      const installResponse = await migrationRulesRoutes.install({
        migrationId,
        payload: { ids, enabled: true },
      });
      expect(installResponse.body).toEqual({ installed: 3 });

      // fetch installed rules
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      expect(rulesResponse.data.length).toEqual(3);

      // Installed rules should be enabled
      rulesResponse.data.forEach((rule: RuleResponse) => {
        expect(rule.enabled).toEqual(true);
      });
    });

    it('should return zero installed rules as a response for the non-existing migration', async () => {
      const migrationId = uuidv4();
      const installResponse = await migrationRulesRoutes.install({ migrationId, payload: {} });
      expect(installResponse.body).toEqual({ installed: 0 });
    });

    it('should return an error if body payload is not passed', async () => {
      const migrationId = uuidv4();
      const installResponse = await migrationRulesRoutes.install({
        migrationId,
        expectStatusCode: 400,
      });
      expect(installResponse.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body]: Expected object, received null',
      });
    });
  });
};
