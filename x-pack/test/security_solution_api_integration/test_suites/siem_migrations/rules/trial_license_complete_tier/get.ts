/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import {
  RuleTranslationResult,
  SiemMigrationStatus,
} from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import {
  RuleMigrationDocument,
  createMigrationRules,
  defaultElasticRule,
  defaultOriginalRule,
  deleteAllMigrationRules,
  getMigrationRuleDocument,
  getMigrationRuleDocuments,
  migrationRulesRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Get API', () => {
    beforeEach(async () => {
      await deleteAllMigrationRules(es);
    });

    describe('Basic', () => {
      it('should fetch existing rules within specified migration', async () => {
        // create a document
        const migrationId = uuidv4();
        const migrationRuleDocument = getMigrationRuleDocument({ migration_id: migrationId });
        await createMigrationRules(es, [migrationRuleDocument]);

        const { '@timestamp': timestamp, updated_at: updatedAt, ...rest } = migrationRuleDocument;

        // fetch migration rule
        const response = await migrationRulesRoutes.get({ migrationId });
        expect(response.body.total).toEqual(1);
        expect(response.body.data).toEqual(expect.arrayContaining([expect.objectContaining(rest)]));
      });
    });

    describe('Filtering', () => {
      it('should fetch rules filtered by `searchTerm`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const title = `${index < 5 ? 'Elastic' : 'Splunk'} rule - ${index}`;
          const originalRule = { ...defaultOriginalRule, title };
          const elasticRule = { ...defaultElasticRule, title };
          return {
            migration_id: migrationId,
            original_rule: originalRule,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // Search by word `Elastic`
        let expectedRuleDocuments = expect.arrayContaining(
          migrationRuleDocuments
            .slice(0, 5)
            .map(({ '@timestamp': timestamp, updated_at: updatedAt, ...rest }) =>
              expect.objectContaining(rest)
            )
        );

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { search_term: 'Elastic' },
        });
        expect(response.body.total).toEqual(5);
        expect(response.body.data).toEqual(expectedRuleDocuments);

        // Search by word `Splunk`
        expectedRuleDocuments = expect.arrayContaining(
          migrationRuleDocuments
            .slice(5)
            .map(({ '@timestamp': timestamp, updated_at: updatedAt, ...rest }) =>
              expect.objectContaining(rest)
            )
        );

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { search_term: 'Splunk' },
        });
        expect(response.body.total).toEqual(5);
        expect(response.body.data).toEqual(expectedRuleDocuments);
      });

      it('should fetch rules filtered by `ids`', async () => {
        // create a document
        const migrationId = uuidv4();

        const migrationRuleDocuments = getMigrationRuleDocuments(10, () => ({
          migration_id: migrationId,
        }));
        const createdDocumentIds = await createMigrationRules(es, migrationRuleDocuments);

        const expectedIds = createdDocumentIds.slice(0, 3).sort();

        // fetch migration rules by existing ids
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { ids: expectedIds },
        });
        expect(response.body.total).toEqual(3);
        expect(response.body.data.map(({ id }) => id).sort()).toEqual(expectedIds);

        // fetch migration rules by non-existing id
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { ids: [uuidv4()] },
        });
        expect(response.body.total).toEqual(0);
      });

      it('should fetch rules filtered by `prebuilt`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const prebuiltRuleId = index < 3 ? uuidv4() : undefined;
          const elasticRule = { ...defaultElasticRule, prebuilt_rule_id: prebuiltRuleId };
          return {
            migration_id: migrationId,
            elastic_rule: elasticRule,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules matched Elastic prebuilt rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_prebuilt: true },
        });
        expect(response.body.total).toEqual(3);

        // fetch custom translated migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_prebuilt: false },
        });
        expect(response.body.total).toEqual(7);
      });

      it('should fetch rules filtered by `installed`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const installedRuleId = index < 2 ? uuidv4() : undefined;
          const elasticRule = { ...defaultElasticRule, id: installedRuleId };
          return {
            migration_id: migrationId,
            elastic_rule: elasticRule,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch installed migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_installed: true },
        });
        expect(response.body.total).toEqual(2);

        // fetch non-installed migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_installed: false },
        });
        expect(response.body.total).toEqual(8);
      });

      it('should fetch rules filtered by `failed`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const status = index < 4 ? SiemMigrationStatus.FAILED : SiemMigrationStatus.COMPLETED;
          return {
            migration_id: migrationId,
            status,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch failed migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_failed: true },
        });
        expect(response.body.total).toEqual(4);

        // fetch non-failed migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_failed: false },
        });
        expect(response.body.total).toEqual(6);
      });

      it('should fetch rules filtered by `fullyTranslated`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const translationResult =
            index < 6
              ? RuleTranslationResult.FULL
              : index < 8
              ? RuleTranslationResult.PARTIAL
              : RuleTranslationResult.UNTRANSLATABLE;
          return {
            migration_id: migrationId,
            translation_result: translationResult,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch failed migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_fully_translated: true },
        });
        expect(response.body.total).toEqual(6);

        // fetch non-failed migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_fully_translated: false },
        });
        expect(response.body.total).toEqual(4);
      });

      it('should fetch rules filtered by `partiallyTranslated`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const translationResult =
            index < 4
              ? RuleTranslationResult.FULL
              : index < 8
              ? RuleTranslationResult.PARTIAL
              : RuleTranslationResult.UNTRANSLATABLE;
          return {
            migration_id: migrationId,
            translation_result: translationResult,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch failed migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_partially_translated: true },
        });
        expect(response.body.total).toEqual(4);

        // fetch non-failed migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_partially_translated: false },
        });
        expect(response.body.total).toEqual(6);
      });

      it('should fetch rules filtered by `untranslatable`', async () => {
        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const translationResult =
            index < 3
              ? RuleTranslationResult.FULL
              : index < 5
              ? RuleTranslationResult.PARTIAL
              : RuleTranslationResult.UNTRANSLATABLE;
          return {
            migration_id: migrationId,
            translation_result: translationResult,
          };
        };

        const migrationRuleDocuments = getMigrationRuleDocuments(10, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch failed migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_untranslatable: true },
        });
        expect(response.body.total).toEqual(5);

        // fetch non-failed migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { is_untranslatable: false },
        });
        expect(response.body.total).toEqual(5);
      });
    });

    describe('Sorting', () => {
      it('should fetch rules sorted by `title`', async () => {
        const titles = ['Elastic 1', 'Windows', 'Linux', 'Elastic 2'];

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const title = titles[index];
          const originalRule = { ...defaultOriginalRule, title };
          const elasticRule = { ...defaultElasticRule, title };
          return {
            migration_id: migrationId,
            original_rule: originalRule,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(titles.length, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.title', sort_direction: 'asc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.title)).toEqual(titles.sort());

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.title', sort_direction: 'desc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.title)).toEqual(
          titles.sort().reverse()
        );
      });

      it('should fetch rules sorted by `severity`', async () => {
        const severities = ['critical', 'low', 'medium', 'low', 'critical'];

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const severity = severities[index];
          const elasticRule = { ...defaultElasticRule, severity };
          return {
            migration_id: migrationId,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(
          severities.length,
          overrideCallback
        );
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.severity', sort_direction: 'asc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.severity)).toEqual([
          'low',
          'low',
          'medium',
          'critical',
          'critical',
        ]);

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.severity', sort_direction: 'desc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.severity)).toEqual([
          'critical',
          'critical',
          'medium',
          'low',
          'low',
        ]);
      });

      it('should fetch rules sorted by `risk_score`', async () => {
        const riskScores = [55, 0, 100, 23];

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const riskScore = riskScores[index];
          const elasticRule = { ...defaultElasticRule, risk_score: riskScore };
          return {
            migration_id: migrationId,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(
          riskScores.length,
          overrideCallback
        );
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.risk_score', sort_direction: 'asc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.risk_score)).toEqual(
          riskScores.sort((a, b) => {
            return a - b;
          })
        );

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.risk_score', sort_direction: 'desc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.risk_score)).toEqual(
          riskScores
            .sort((a, b) => {
              return a - b;
            })
            .reverse()
        );
      });

      it('should fetch rules sorted by `prebuilt_rule_id`', async () => {
        const prebuiltRuleIds = ['rule-1', undefined, undefined, 'rule-2', undefined];

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const prebuiltRuleId = prebuiltRuleIds[index];
          const elasticRule = { ...defaultElasticRule, prebuilt_rule_id: prebuiltRuleId };
          return {
            migration_id: migrationId,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(
          prebuiltRuleIds.length,
          overrideCallback
        );
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.prebuilt_rule_id', sort_direction: 'asc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.prebuilt_rule_id)).toEqual([
          undefined,
          undefined,
          undefined,
          'rule-1',
          'rule-2',
        ]);

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'elastic_rule.prebuilt_rule_id', sort_direction: 'desc' },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.prebuilt_rule_id)).toEqual([
          'rule-2',
          'rule-1',
          undefined,
          undefined,
          undefined,
        ]);
      });

      it('should fetch rules sorted by `translation_result`', async () => {
        const translationResults = [
          RuleTranslationResult.UNTRANSLATABLE,
          RuleTranslationResult.FULL,
          RuleTranslationResult.PARTIAL,
        ];

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          return {
            migration_id: migrationId,
            translation_result: translationResults[index],
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(
          translationResults.length,
          overrideCallback
        );
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'translation_result', sort_direction: 'asc' },
        });
        expect(response.body.data.map((rule) => rule.translation_result)).toEqual([
          RuleTranslationResult.UNTRANSLATABLE,
          RuleTranslationResult.PARTIAL,
          RuleTranslationResult.FULL,
        ]);

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'translation_result', sort_direction: 'desc' },
        });
        expect(response.body.data.map((rule) => rule.translation_result)).toEqual([
          RuleTranslationResult.FULL,
          RuleTranslationResult.PARTIAL,
          RuleTranslationResult.UNTRANSLATABLE,
        ]);
      });

      it('should fetch rules sorted by `updated_at`', async () => {
        // create a document
        const migrationId = uuidv4();

        // Creating documents separately to have different `update_at` timestamps
        await createMigrationRules(es, [getMigrationRuleDocument({ migration_id: migrationId })]);
        await createMigrationRules(es, [getMigrationRuleDocument({ migration_id: migrationId })]);
        await createMigrationRules(es, [getMigrationRuleDocument({ migration_id: migrationId })]);
        await createMigrationRules(es, [getMigrationRuleDocument({ migration_id: migrationId })]);
        await createMigrationRules(es, [getMigrationRuleDocument({ migration_id: migrationId })]);

        // fetch migration rules
        let response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'updated_at', sort_direction: 'asc' },
        });
        const ascSorted = response.body.data.map((rule) => rule.updated_at);

        // fetch migration rules
        response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { sort_field: 'updated_at', sort_direction: 'desc' },
        });
        const descSorted = response.body.data.map((rule) => rule.updated_at);

        expect(ascSorted).toEqual(descSorted.reverse());
      });
    });

    describe('Pagination', () => {
      it('should fetch rules within specific page', async () => {
        const titles = Array.from({ length: 50 }, (_, index) => `Migration rule - ${index}`);

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const title = titles[index];
          const originalRule = { ...defaultOriginalRule, title };
          const elasticRule = { ...defaultElasticRule, title };
          return {
            migration_id: migrationId,
            original_rule: originalRule,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(titles.length, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        const response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { page: 3, per_page: 7 },
        });
        const start = 3 * 7;
        expect(response.body.data.map((rule) => rule.elastic_rule?.title)).toEqual(
          titles.slice(start, start + 7)
        );
      });

      it('should fetch rules within very first page if `perPage` is not specified', async () => {
        const titles = Array.from({ length: 50 }, (_, index) => `Migration rule - ${index}`);

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const title = titles[index];
          const originalRule = { ...defaultOriginalRule, title };
          const elasticRule = { ...defaultElasticRule, title };
          return {
            migration_id: migrationId,
            original_rule: originalRule,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(titles.length, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        const response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { page: 3 },
        });
        const defaultSize = 10;
        expect(response.body.data.map((rule) => rule.elastic_rule?.title)).toEqual(
          titles.slice(0, defaultSize)
        );
      });

      it('should fetch rules within very first page of a specified size if `perPage` is specified', async () => {
        const titles = Array.from({ length: 50 }, (_, index) => `Migration rule - ${index}`);

        // create a document
        const migrationId = uuidv4();

        const overrideCallback = (index: number): Partial<RuleMigrationDocument> => {
          const title = titles[index];
          const originalRule = { ...defaultOriginalRule, title };
          const elasticRule = { ...defaultElasticRule, title };
          return {
            migration_id: migrationId,
            original_rule: originalRule,
            elastic_rule: elasticRule,
          };
        };
        const migrationRuleDocuments = getMigrationRuleDocuments(titles.length, overrideCallback);
        await createMigrationRules(es, migrationRuleDocuments);

        // fetch migration rules
        const response = await migrationRulesRoutes.get({
          migrationId,
          queryParams: { per_page: 18 },
        });
        expect(response.body.data.map((rule) => rule.elastic_rule?.title)).toEqual(
          titles.slice(0, 18)
        );
      });
    });
  });
};
